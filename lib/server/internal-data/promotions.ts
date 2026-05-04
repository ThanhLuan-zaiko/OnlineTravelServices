import "server-only";

import { uuidv7 } from "uuidv7";

import { executeQuery } from "@/lib/server/scylla";
import type { PromotionMutationRequest } from "@/lib/shared/internal";

import {
  decimal,
  PROMOTION_LIST_STATUSES,
  toPromotion,
  type PromotionRow,
} from "./shared";

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
  const statuses = status ? [status] : [...PROMOTION_LIST_STATUSES];
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

export async function findInternalPromotion(promotionId: string) {
  const rows = await executeQuery<PromotionRow>(
    `SELECT promotion_id, code, title, description, status, promotion_type, customer_tier,
            discount_type, discount_value, max_discount_amount, start_at, end_at,
            usage_limit, used_count, created_by
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
      (promotion_id, code, title, description, status, promotion_type, customer_tier,
       discount_type, discount_value, max_discount_amount, start_at, end_at, usage_limit, used_count, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      promotionId,
      input.code,
      input.title,
      input.description ?? null,
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
     SET code = ?, title = ?, description = ?, status = ?, promotion_type = ?, customer_tier = ?,
         discount_type = ?, discount_value = ?, max_discount_amount = ?, start_at = ?, end_at = ?,
         usage_limit = ?
     WHERE promotion_id = ?`,
    [
      input.code,
      input.title,
      input.description ?? null,
      input.status,
      input.promotionType,
      input.customerTier,
      input.discountType,
      decimal(input.discountValue),
      input.maxDiscountAmount ? decimal(input.maxDiscountAmount) : null,
      new Date(input.startAt),
      new Date(input.endAt),
      input.usageLimit,
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

  return updateInternalPromotion(promotionId, {
    ...existing,
    status: "archived",
  });
}
