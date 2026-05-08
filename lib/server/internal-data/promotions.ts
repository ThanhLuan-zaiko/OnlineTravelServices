import "server-only";

import { uuidv7 } from "uuidv7";

import { storeImageAsset } from "@/lib/server/media-storage";
import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type { PromotionMutationRequest } from "@/lib/shared/internal";

import { decimal, PROMOTION_LIST_STATUSES, toPromotion, toPromotionMedia, type PromotionMediaRow, type PromotionRow } from "./shared";

type PromotionStatus = "archived" | "draft" | "expired" | "published" | "scheduled";

const DEFAULT_PROMOTION_PAGE_SIZE = 8;
const MAX_PROMOTION_PAGE_SIZE = 48;
const SEARCH_SCAN_MULTIPLIER = 4;
const RESTORE_FALLBACK_STATUS = "draft";

function promotionColumns() {
  return `promotion_id, archived_at, archived_from_status, code, title, description, image_url, status, promotion_type, customer_tier,
          discount_type, discount_value, max_discount_amount, start_at, end_at, usage_limit, used_count, created_by, thumbnail_url`;
}

function clampPromotionPageSize(limit?: number) {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_PROMOTION_PAGE_SIZE;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PROMOTION_PAGE_SIZE);
}

function promotionMatchesSearch(promotion: ReturnType<typeof toPromotion>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [promotion.code, promotion.title, promotion.customerTier, promotion.promotionType, promotion.promotionId].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

async function writePromotionProjections(promotionId: string, input: PromotionMutationRequest) {
  await Promise.all([
    executeQuery(
      `INSERT INTO promotions_by_status
        (status, start_at, promotion_id, code, title, customer_tier, discount_type, discount_value, end_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.status,
        new Date(input.startAt),
        promotionId,
        input.code,
        input.title,
        input.customerTier,
        input.discountType,
        decimal(input.discountValue),
        new Date(input.endAt),
      ],
    ),
    executeQuery(
      `INSERT INTO promotions_by_customer_tier
        (customer_tier, status, end_at, promotion_id, code, title, discount_type, discount_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.customerTier,
        input.status,
        new Date(input.endAt),
        promotionId,
        input.code,
        input.title,
        input.discountType,
        decimal(input.discountValue),
      ],
    ),
  ]);
}

export async function listInternalPromotions(status?: string) {
  const statuses = status ? [status] : [...PROMOTION_LIST_STATUSES].filter((item) => item !== "archived");
  const promotionIds = new Set<string>();

  for (const currentStatus of statuses) {
    const rows = await executeQuery<{ promotion_id: string }>(
      "SELECT promotion_id FROM promotions_by_status WHERE status = ? LIMIT 80",
      [currentStatus],
    );

    for (const row of rows) {
      promotionIds.add(String(row.promotion_id));
    }
  }

  const promotions = await Promise.all([...promotionIds].map((promotionId) => findInternalPromotion(promotionId)));

  return promotions
    .filter((promotion): promotion is NonNullable<Awaited<ReturnType<typeof findInternalPromotion>>> => Boolean(promotion))
    .filter((promotion) => !status || promotion.status === status)
    .sort((left, right) => right.startAt.localeCompare(left.startAt));
}

export async function listInternalPromotionsPage(
  status: PromotionStatus,
  options?: {
    cursor?: string | null;
    limit?: number;
    query?: string;
  },
) {
  const limit = clampPromotionPageSize(options?.limit);
  const query = options?.query?.trim();
  const fetchSize = query ? Math.min(limit * SEARCH_SCAN_MULTIPLIER, MAX_PROMOTION_PAGE_SIZE * SEARCH_SCAN_MULTIPLIER) : limit;
  const promotions: ReturnType<typeof toPromotion>[] = [];
  let pageState: string | Buffer | null = options?.cursor ?? null;

  do {
    const page: { pageState: string | Buffer | null; rows: { promotion_id: string }[] } = await executePagedQuery<{ promotion_id: string }>(
      "SELECT promotion_id FROM promotions_by_status WHERE status = ?",
      [status],
      { fetchSize, pageState },
    );

    pageState = page.pageState;
    const pagePromotions = (await Promise.all(page.rows.map((row) => findInternalPromotion(String(row.promotion_id)))))
      .filter((promotion): promotion is NonNullable<Awaited<ReturnType<typeof findInternalPromotion>>> => Boolean(promotion))
      .filter((promotion) => promotion.status === status)
      .filter((promotion) => promotionMatchesSearch(promotion, query));

    promotions.push(...pagePromotions);
  } while (promotions.length < limit && pageState);

  return {
    nextCursor: pageState ? String(pageState) : null,
    promotions: promotions.slice(0, limit),
  };
}

export async function findInternalPromotion(promotionId: string) {
  const rows = await executeQuery<PromotionRow>(
    `SELECT ${promotionColumns()}
     FROM promotions_by_id
     WHERE promotion_id = ?`,
    [promotionId],
  );

  return rows[0] ? toPromotion(rows[0]) : null;
}

export async function createInternalPromotion(input: PromotionMutationRequest, actorUserId: string) {
  const promotionId = String(uuidv7());

  await executeQuery(
    `INSERT INTO promotions_by_id
      (promotion_id, archived_at, archived_from_status, code, title, description, image_url, status, promotion_type, customer_tier,
       discount_type, discount_value, max_discount_amount, start_at, end_at, usage_limit, used_count, created_by, thumbnail_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      promotionId,
      null,
      null,
      input.code,
      input.title,
      input.description ?? null,
      null,
      input.status,
      input.promotionType,
      input.customerTier,
      input.discountType,
      decimal(input.discountValue),
      input.maxDiscountAmount ? decimal(input.maxDiscountAmount) : null,
      new Date(input.startAt),
      new Date(input.endAt),
      input.usageLimit,
      0,
      actorUserId,
      null,
    ],
  );
  await writePromotionProjections(promotionId, input);

  return findInternalPromotion(promotionId);
}

export async function updateInternalPromotion(promotionId: string, input: PromotionMutationRequest) {
  const existing = await findInternalPromotion(promotionId);

  if (!existing) {
    return null;
  }

  await executeQuery(
    `UPDATE promotions_by_id
     SET archived_at = ?, archived_from_status = ?, code = ?, title = ?, description = ?, image_url = ?, status = ?,
         promotion_type = ?, customer_tier = ?, discount_type = ?, discount_value = ?, max_discount_amount = ?,
         start_at = ?, end_at = ?, usage_limit = ?, thumbnail_url = ?
     WHERE promotion_id = ?`,
    [
      input.status === "archived" ? (existing.archivedAt ? new Date(existing.archivedAt) : new Date()) : null,
      input.status === "archived" ? (existing.status === "archived" ? existing.archivedFromStatus : existing.status) : null,
      input.code,
      input.title,
      input.description ?? null,
      existing.imageUrl,
      input.status,
      input.promotionType,
      input.customerTier,
      input.discountType,
      decimal(input.discountValue),
      input.maxDiscountAmount ? decimal(input.maxDiscountAmount) : null,
      new Date(input.startAt),
      new Date(input.endAt),
      input.usageLimit,
      existing.thumbnailUrl,
      promotionId,
    ],
  );
  await writePromotionProjections(promotionId, input);

  return findInternalPromotion(promotionId);
}

export async function archiveInternalPromotion(promotionId: string) {
  const existing = await findInternalPromotion(promotionId);

  if (!existing) {
    return null;
  }

  if (existing.status === "archived") {
    return existing;
  }

  return updateInternalPromotion(promotionId, {
    ...existing,
    status: "archived",
  });
}

export async function restoreInternalPromotion(promotionId: string) {
  const existing = await findInternalPromotion(promotionId);

  if (!existing) {
    return null;
  }

  if (existing.status !== "archived") {
    return existing;
  }

  return updateInternalPromotion(promotionId, {
    ...existing,
    status: existing.archivedFromStatus ?? RESTORE_FALLBACK_STATUS,
  });
}

export async function hardDeleteInternalPromotion(promotionId: string) {
  const existing = await findInternalPromotion(promotionId);

  if (!existing) {
    return null;
  }

  const media = await listPromotionMedia(promotionId);

  for (const item of media) {
    await executeQuery(
      "DELETE FROM promotion_media_by_promotion WHERE promotion_id = ? AND media_order = ? AND media_id = ?",
      [promotionId, item.mediaOrder, item.mediaId],
    );
  }

  await executeQuery("DELETE FROM promotions_by_id WHERE promotion_id = ?", [promotionId]);

  return { media, promotion: existing };
}

export async function listPromotionMedia(promotionId: string) {
  const rows = await executeQuery<PromotionMediaRow>(
    `SELECT promotion_id, media_order, media_id, media_url, thumbnail_url, title, uploaded_at, uploaded_by, is_cover
     FROM promotion_media_by_promotion
     WHERE promotion_id = ?
     ORDER BY media_order ASC, media_id ASC`,
    [promotionId],
  );

  return rows.map(toPromotionMedia);
}

export async function findPromotionMedia(promotionId: string, mediaId: string) {
  const media = await listPromotionMedia(promotionId);

  return media.find((item) => item.mediaId === mediaId) ?? null;
}

async function clearPromotionMediaCoverFlags(promotionId: string) {
  const media = await listPromotionMedia(promotionId);

  for (const item of media) {
    if (!item.isCover) {
      continue;
    }

    await executeQuery(
      "UPDATE promotion_media_by_promotion SET is_cover = ? WHERE promotion_id = ? AND media_order = ? AND media_id = ?",
      [false, promotionId, item.mediaOrder, item.mediaId],
    );
  }
}

async function syncPromotionCover(promotionId: string) {
  const media = await listPromotionMedia(promotionId);
  const cover = media.find((item) => item.isCover) ?? media[0] ?? null;

  await executeQuery(
    "UPDATE promotions_by_id SET image_url = ?, thumbnail_url = ? WHERE promotion_id = ?",
    [cover?.mediaUrl ?? null, cover?.thumbnailUrl ?? null, promotionId],
  );
}

export async function addPromotionMedia(
  promotionId: string,
  input: {
    isCover?: boolean;
    sourceBuffer: Buffer;
    sourceName: string;
    title?: string | null;
    uploadedBy: string;
  },
) {
  const promotion = await findInternalPromotion(promotionId);

  if (!promotion) {
    return null;
  }

  const existingMedia = await listPromotionMedia(promotionId);
  const shouldBeCover = Boolean(input.isCover) || existingMedia.length === 0 || !promotion.imageUrl;
  const mediaId = String(uuidv7());
  const mediaOrder = existingMedia.length + 1;
  const uploadedAt = new Date();
  const stored = await storeImageAsset({
    folder: ["promotions", promotionId],
    sourceBuffer: input.sourceBuffer,
    sourceName: input.sourceName || "promotion-image",
  });

  if (shouldBeCover) {
    await clearPromotionMediaCoverFlags(promotionId);
  }

  await executeQuery(
    `INSERT INTO promotion_media_by_promotion
      (promotion_id, media_order, media_id, media_url, thumbnail_url, title, uploaded_at, uploaded_by, is_cover)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [promotionId, mediaOrder, mediaId, stored.fullUrl, stored.thumbnailUrl, input.title ?? null, uploadedAt, input.uploadedBy, shouldBeCover],
  );

  if (shouldBeCover) {
    await syncPromotionCover(promotionId);
  }

  return findPromotionMedia(promotionId, mediaId);
}

export async function setPromotionMediaCover(promotionId: string, mediaId: string) {
  const target = await findPromotionMedia(promotionId, mediaId);

  if (!target) {
    return null;
  }

  await clearPromotionMediaCoverFlags(promotionId);
  await executeQuery(
    "UPDATE promotion_media_by_promotion SET is_cover = ? WHERE promotion_id = ? AND media_order = ? AND media_id = ?",
    [true, promotionId, target.mediaOrder, mediaId],
  );
  await syncPromotionCover(promotionId);

  return findPromotionMedia(promotionId, mediaId);
}

export async function deletePromotionMedia(promotionId: string, mediaId: string) {
  const existing = await findPromotionMedia(promotionId, mediaId);

  if (!existing) {
    return null;
  }

  await executeQuery(
    "DELETE FROM promotion_media_by_promotion WHERE promotion_id = ? AND media_order = ? AND media_id = ?",
    [promotionId, existing.mediaOrder, mediaId],
  );
  await syncPromotionCover(promotionId);

  return existing;
}
