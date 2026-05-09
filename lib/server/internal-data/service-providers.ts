import "server-only";

import { uuidv7 } from "uuidv7";

import { storeImageAsset } from "@/lib/server/media-storage";
import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type { ServiceProviderMutationRequest } from "@/lib/shared/internal";

import { toServiceProvider, toServiceProviderMedia, type ServiceProviderMediaRow, type ServiceProviderRow } from "./shared";

const ACTIVE_PROVIDER_STATUSES = ["active", "inactive", "suspended"] as const;
type ProviderStatus = "active" | "archived" | "inactive" | "suspended";
const DEFAULT_PROVIDER_PAGE_SIZE = 8;
const MAX_PROVIDER_PAGE_SIZE = 48;
const SEARCH_SCAN_MULTIPLIER = 4;
const RESTORE_FALLBACK_STATUS = "inactive";

function providerColumns() {
  return `service_type, status, provider_id, archived_at, archived_from_status, image_url,
          provider_name, region, phone, email, rating, contract_status, thumbnail_url, updated_at`;
}

function clampProviderPageSize(limit?: number) {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_PROVIDER_PAGE_SIZE;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PROVIDER_PAGE_SIZE);
}

function providerMatchesSearch(provider: ReturnType<typeof toServiceProvider>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [provider.providerName, provider.serviceType, provider.region, provider.email, provider.phone, provider.providerId].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

function normalizeWritableStatus(status: ServiceProviderMutationRequest["status"]) {
  return status === "archived" ? RESTORE_FALLBACK_STATUS : status;
}

function providerRatingDecimal(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

async function insertProvider(providerId: string, input: ServiceProviderMutationRequest, updatedAt: Date) {
  await executeQuery(
    `INSERT INTO service_providers_by_type
      (service_type, status, provider_id, archived_at, archived_from_status, image_url,
       provider_name, region, phone, email, rating, contract_status, thumbnail_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.serviceType,
      normalizeWritableStatus(input.status),
      providerId,
      null,
      null,
      null,
      input.providerName,
      input.region,
      input.phone,
      input.email,
      providerRatingDecimal(input.rating),
      input.contractStatus,
      null,
      updatedAt,
    ],
  );
}

export async function listInternalServiceProviders(serviceType: string, status?: string) {
  const statuses = status ? [status] : [...ACTIVE_PROVIDER_STATUSES];
  const providers = [];

  for (const currentStatus of statuses) {
    const rows = await executeQuery<ServiceProviderRow>(
      `SELECT ${providerColumns()}
       FROM service_providers_by_type
       WHERE service_type = ? AND status = ?
       ORDER BY provider_id ASC`,
      [serviceType, currentStatus],
    );

    providers.push(...rows.map(toServiceProvider));
  }

  return providers.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listInternalServiceProvidersPage(
  serviceType: string,
  status: ProviderStatus,
  options?: {
    cursor?: string | null;
    limit?: number;
    query?: string;
  },
) {
  const limit = clampProviderPageSize(options?.limit);
  const query = options?.query?.trim();
  const fetchSize = query ? Math.min(limit * SEARCH_SCAN_MULTIPLIER, MAX_PROVIDER_PAGE_SIZE * SEARCH_SCAN_MULTIPLIER) : limit;
  const providers: ReturnType<typeof toServiceProvider>[] = [];
  let pageState: string | Buffer | null = options?.cursor ?? null;

  do {
    const page: { pageState: string | Buffer | null; rows: ServiceProviderRow[] } = await executePagedQuery<ServiceProviderRow>(
      `SELECT ${providerColumns()}
       FROM service_providers_by_type
       WHERE service_type = ? AND status = ?
       ORDER BY provider_id ASC`,
      [serviceType, status],
      {
        fetchSize,
        pageState,
      },
    );

    pageState = page.pageState;
    providers.push(...page.rows.map(toServiceProvider).filter((provider) => providerMatchesSearch(provider, query)));
  } while (providers.length < limit && pageState);

  return {
    nextCursor: pageState ? String(pageState) : null,
    providers: providers.slice(0, limit),
  };
}

export async function findInternalServiceProviderById(serviceType: string, providerId: string) {
  const rows = await executeQuery<ServiceProviderRow>(
    `SELECT ${providerColumns()}
     FROM service_providers_by_type
     WHERE service_type = ? AND provider_id = ? ALLOW FILTERING`,
    [serviceType, providerId],
  );

  return rows[0] ? toServiceProvider(rows[0]) : null;
}

export async function findInternalServiceProvider(serviceType: string, status: string, providerId: string) {
  const rows = await executeQuery<ServiceProviderRow>(
    `SELECT ${providerColumns()}
     FROM service_providers_by_type
     WHERE service_type = ? AND status = ? AND provider_id = ?`,
    [serviceType, status, providerId],
  );

  return rows[0] ? toServiceProvider(rows[0]) : null;
}

export async function createInternalServiceProvider(input: ServiceProviderMutationRequest) {
  const providerId = String(uuidv7());
  const updatedAt = new Date();

  await insertProvider(providerId, input, updatedAt);

  return findInternalServiceProviderById(input.serviceType, providerId);
}

export async function updateInternalServiceProvider(serviceType: string, providerId: string, input: ServiceProviderMutationRequest) {
  const existing = await findInternalServiceProviderById(serviceType, providerId);

  if (!existing) {
    return null;
  }

  await executeQuery(
    "DELETE FROM service_providers_by_type WHERE service_type = ? AND status = ? AND provider_id = ?",
    [serviceType, existing.status, providerId],
  );

  const nextStatus = normalizeWritableStatus(input.status);
  await executeQuery(
    `INSERT INTO service_providers_by_type
      (service_type, status, provider_id, archived_at, archived_from_status, image_url,
       provider_name, region, phone, email, rating, contract_status, thumbnail_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.serviceType,
      nextStatus,
      providerId,
      null,
      null,
      existing.imageUrl,
      input.providerName,
      input.region,
      input.phone,
      input.email,
      providerRatingDecimal(input.rating),
      input.contractStatus,
      existing.thumbnailUrl,
      new Date(),
    ],
  );

  return findInternalServiceProviderById(input.serviceType, providerId);
}

export async function archiveInternalServiceProvider(serviceType: string, providerId: string) {
  const existing = await findInternalServiceProviderById(serviceType, providerId);

  if (!existing) {
    return null;
  }

  if (existing.status === "archived") {
    return existing;
  }

  await executeQuery(
    "DELETE FROM service_providers_by_type WHERE service_type = ? AND status = ? AND provider_id = ?",
    [serviceType, existing.status, providerId],
  );

  await executeQuery(
    `INSERT INTO service_providers_by_type
      (service_type, status, provider_id, archived_at, archived_from_status, image_url,
       provider_name, region, phone, email, rating, contract_status, thumbnail_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      serviceType,
      "archived",
      providerId,
      new Date(),
      existing.status,
      existing.imageUrl,
      existing.providerName,
      existing.region,
      existing.phone,
      existing.email,
      providerRatingDecimal(existing.rating),
      existing.contractStatus,
      existing.thumbnailUrl,
      new Date(),
    ],
  );

  return findInternalServiceProviderById(serviceType, providerId);
}

export async function restoreInternalServiceProvider(serviceType: string, providerId: string) {
  const existing = await findInternalServiceProviderById(serviceType, providerId);

  if (!existing) {
    return null;
  }

  if (existing.status !== "archived") {
    return existing;
  }

  const nextStatus = existing.archivedFromStatus ?? RESTORE_FALLBACK_STATUS;

  await executeQuery(
    "DELETE FROM service_providers_by_type WHERE service_type = ? AND status = ? AND provider_id = ?",
    [serviceType, existing.status, providerId],
  );

  await executeQuery(
    `INSERT INTO service_providers_by_type
      (service_type, status, provider_id, archived_at, archived_from_status, image_url,
       provider_name, region, phone, email, rating, contract_status, thumbnail_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      serviceType,
      nextStatus,
      providerId,
      null,
      null,
      existing.imageUrl,
      existing.providerName,
      existing.region,
      existing.phone,
      existing.email,
      providerRatingDecimal(existing.rating),
      existing.contractStatus,
      existing.thumbnailUrl,
      new Date(),
    ],
  );

  return findInternalServiceProviderById(serviceType, providerId);
}

export async function hardDeleteInternalServiceProvider(serviceType: string, providerId: string) {
  const existing = await findInternalServiceProviderById(serviceType, providerId);

  if (!existing) {
    return null;
  }

  const media = await listServiceProviderMedia(serviceType, providerId);

  for (const item of media) {
    await executeQuery(
      "DELETE FROM service_provider_media_by_provider WHERE service_type = ? AND provider_id = ? AND media_order = ? AND media_id = ?",
      [serviceType, providerId, item.mediaOrder, item.mediaId],
    );
  }

  await executeQuery(
    "DELETE FROM service_providers_by_type WHERE service_type = ? AND status = ? AND provider_id = ?",
    [serviceType, existing.status, providerId],
  );

  return {
    media,
    provider: existing,
  };
}

export const deleteInternalServiceProvider = archiveInternalServiceProvider;

export async function listServiceProviderMedia(serviceType: string, providerId: string) {
  const rows = await executeQuery<ServiceProviderMediaRow>(
    `SELECT service_type, provider_id, media_order, media_id, media_url, thumbnail_url, title, uploaded_at, uploaded_by, is_cover
     FROM service_provider_media_by_provider
     WHERE service_type = ? AND provider_id = ?
     ORDER BY media_order ASC, media_id ASC`,
    [serviceType, providerId],
  );

  return rows.map(toServiceProviderMedia);
}

export async function findServiceProviderMedia(serviceType: string, providerId: string, mediaId: string) {
  const media = await listServiceProviderMedia(serviceType, providerId);

  return media.find((item) => item.mediaId === mediaId) ?? null;
}

async function clearServiceProviderMediaCoverFlags(serviceType: string, providerId: string) {
  const media = await listServiceProviderMedia(serviceType, providerId);

  for (const item of media) {
    if (!item.isCover) {
      continue;
    }

    await executeQuery(
      "UPDATE service_provider_media_by_provider SET is_cover = ? WHERE service_type = ? AND provider_id = ? AND media_order = ? AND media_id = ?",
      [false, serviceType, providerId, item.mediaOrder, item.mediaId],
    );
  }
}

async function syncServiceProviderCover(serviceType: string, providerId: string) {
  const media = await listServiceProviderMedia(serviceType, providerId);
  const cover = media.find((item) => item.isCover) ?? media[0] ?? null;
  const provider = await findInternalServiceProviderById(serviceType, providerId);

  if (!provider) {
    return null;
  }

  await executeQuery(
    `UPDATE service_providers_by_type
     SET image_url = ?, thumbnail_url = ?, updated_at = ?
     WHERE service_type = ? AND status = ? AND provider_id = ?`,
    [cover?.mediaUrl ?? null, cover?.thumbnailUrl ?? null, new Date(), serviceType, provider.status, providerId],
  );

  return findInternalServiceProviderById(serviceType, providerId);
}

export async function addServiceProviderMedia(
  serviceType: string,
  providerId: string,
  input: {
    isCover?: boolean;
    sourceBuffer: Buffer;
    sourceName: string;
    title?: string | null;
    uploadedBy: string;
  },
) {
  const provider = await findInternalServiceProviderById(serviceType, providerId);

  if (!provider) {
    return null;
  }

  const existingMedia = await listServiceProviderMedia(serviceType, providerId);
  const shouldBeCover = Boolean(input.isCover) || existingMedia.length === 0 || !provider.imageUrl;
  const mediaId = String(uuidv7());
  const mediaOrder = existingMedia.length + 1;
  const uploadedAt = new Date();
  const stored = await storeImageAsset({
    folder: ["service-providers", serviceType, providerId],
    sourceBuffer: input.sourceBuffer,
    sourceName: input.sourceName || "provider-image",
  });

  if (shouldBeCover) {
    await clearServiceProviderMediaCoverFlags(serviceType, providerId);
  }

  await executeQuery(
    `INSERT INTO service_provider_media_by_provider
      (service_type, provider_id, media_order, media_id, media_url, thumbnail_url, title, uploaded_at, uploaded_by, is_cover)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      serviceType,
      providerId,
      mediaOrder,
      mediaId,
      stored.fullUrl,
      stored.thumbnailUrl,
      input.title ?? null,
      uploadedAt,
      input.uploadedBy,
      shouldBeCover,
    ],
  );

  if (shouldBeCover) {
    await executeQuery(
      `UPDATE service_providers_by_type
       SET image_url = ?, thumbnail_url = ?, updated_at = ?
       WHERE service_type = ? AND status = ? AND provider_id = ?`,
      [stored.fullUrl, stored.thumbnailUrl, uploadedAt, serviceType, provider.status, providerId],
    );
  }

  return findServiceProviderMedia(serviceType, providerId, mediaId);
}

export async function setServiceProviderMediaCover(serviceType: string, providerId: string, mediaId: string) {
  const target = await findServiceProviderMedia(serviceType, providerId, mediaId);
  const provider = await findInternalServiceProviderById(serviceType, providerId);

  if (!target || !provider) {
    return null;
  }

  await clearServiceProviderMediaCoverFlags(serviceType, providerId);
  await executeQuery(
    "UPDATE service_provider_media_by_provider SET is_cover = ? WHERE service_type = ? AND provider_id = ? AND media_order = ? AND media_id = ?",
    [true, serviceType, providerId, target.mediaOrder, mediaId],
  );
  await executeQuery(
    `UPDATE service_providers_by_type
     SET image_url = ?, thumbnail_url = ?, updated_at = ?
     WHERE service_type = ? AND status = ? AND provider_id = ?`,
    [target.mediaUrl, target.thumbnailUrl, new Date(), serviceType, provider.status, providerId],
  );

  return findServiceProviderMedia(serviceType, providerId, mediaId);
}

export async function deleteServiceProviderMedia(serviceType: string, providerId: string, mediaId: string) {
  const existing = await findServiceProviderMedia(serviceType, providerId, mediaId);

  if (!existing) {
    return null;
  }

  await executeQuery(
    "DELETE FROM service_provider_media_by_provider WHERE service_type = ? AND provider_id = ? AND media_order = ? AND media_id = ?",
    [serviceType, providerId, existing.mediaOrder, mediaId],
  );

  await syncServiceProviderCover(serviceType, providerId);

  return existing;
}
