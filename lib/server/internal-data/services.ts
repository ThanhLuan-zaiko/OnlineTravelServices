import "server-only";

import { uuidv7 } from "uuidv7";

import { storeImageAsset } from "@/lib/server/media-storage";
import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type { ServiceCatalogMutationRequest } from "@/lib/shared/internal";

import { findInternalDestination } from "./destinations";
import { decimal, toServiceCatalog, toServiceMedia, type ServiceCatalogRow, type ServiceMediaRow } from "./shared";

type ServiceStatus = "archived" | "draft" | "published";

const ACTIVE_SERVICE_STATUSES = ["draft", "published"] as const;
const DEFAULT_SERVICE_PAGE_SIZE = 8;
const MAX_SERVICE_PAGE_SIZE = 48;
const SEARCH_SCAN_MULTIPLIER = 4;
const RESTORE_FALLBACK_STATUS = "draft";

function serviceColumns() {
  return `destination_id, service_type, service_id, archived_at, archived_from_status, provider_id, image_url,
          name, description, base_price, currency, status, thumbnail_url, updated_at`;
}

function clampServicePageSize(limit?: number) {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_SERVICE_PAGE_SIZE;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_SERVICE_PAGE_SIZE);
}

function serviceMatchesSearch(service: ReturnType<typeof toServiceCatalog>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [service.name, service.serviceType, service.serviceId, service.description ?? "", service.currency].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

export async function listInternalServices(destinationId: string, status?: string) {
  const rows = await executeQuery<ServiceCatalogRow>(
    `SELECT ${serviceColumns()}
     FROM service_catalog_by_destination
     WHERE destination_id = ?
     ORDER BY service_type ASC, service_id ASC`,
    [destinationId],
  );

  return rows
    .map(toServiceCatalog)
    .filter((service) => (status ? service.status === status : ACTIVE_SERVICE_STATUSES.includes(service.status as "draft" | "published")))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listInternalServicesPage(
  destinationId: string,
  status: ServiceStatus,
  options?: {
    cursor?: string | null;
    limit?: number;
    query?: string;
  },
) {
  const limit = clampServicePageSize(options?.limit);
  const query = options?.query?.trim();
  const fetchSize = query ? Math.min(limit * SEARCH_SCAN_MULTIPLIER, MAX_SERVICE_PAGE_SIZE * SEARCH_SCAN_MULTIPLIER) : limit;
  const services: ReturnType<typeof toServiceCatalog>[] = [];
  let pageState: string | Buffer | null = options?.cursor ?? null;

  do {
    const page: { pageState: string | Buffer | null; rows: ServiceCatalogRow[] } = await executePagedQuery<ServiceCatalogRow>(
      `SELECT ${serviceColumns()}
       FROM service_catalog_by_destination
       WHERE destination_id = ?
       ORDER BY service_type ASC, service_id ASC`,
      [destinationId],
      { fetchSize, pageState },
    );

    pageState = page.pageState;
    services.push(
      ...page.rows
        .map(toServiceCatalog)
        .filter((service) => service.status === status)
        .filter((service) => serviceMatchesSearch(service, query)),
    );
  } while (services.length < limit && pageState);

  return {
    nextCursor: pageState ? String(pageState) : null,
    services: services.slice(0, limit),
  };
}

export async function createInternalService(input: ServiceCatalogMutationRequest) {
  const destination = await findInternalDestination(input.destinationId);

  if (!destination) {
    return null;
  }

  const serviceId = String(uuidv7());
  const updatedAt = new Date();

  await executeQuery(
    `INSERT INTO service_catalog_by_destination
      (destination_id, service_type, service_id, archived_at, archived_from_status, provider_id, image_url,
       name, description, base_price, currency, status, thumbnail_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.destinationId,
      input.serviceType,
      serviceId,
      null,
      null,
      input.providerId ?? null,
      null,
      input.name,
      input.description ?? null,
      decimal(input.basePrice),
      input.currency,
      input.status === "archived" ? RESTORE_FALLBACK_STATUS : input.status,
      null,
      updatedAt,
    ],
  );

  return findInternalService(input.destinationId, input.serviceType, serviceId);
}

export async function findInternalService(destinationId: string, serviceType: string, serviceId: string) {
  const rows = await executeQuery<ServiceCatalogRow>(
    `SELECT ${serviceColumns()}
     FROM service_catalog_by_destination
     WHERE destination_id = ? AND service_type = ? AND service_id = ?`,
    [destinationId, serviceType, serviceId],
  );

  return rows[0] ? toServiceCatalog(rows[0]) : null;
}

export async function updateInternalService(
  destinationId: string,
  serviceType: string,
  serviceId: string,
  input: ServiceCatalogMutationRequest,
) {
  const existing = await findInternalService(destinationId, serviceType, serviceId);

  if (!existing) {
    return null;
  }

  const updatedAt = new Date();

  await executeQuery(
    `UPDATE service_catalog_by_destination
     SET provider_id = ?, image_url = ?, name = ?, description = ?, base_price = ?, currency = ?, status = ?,
         thumbnail_url = ?, archived_at = ?, archived_from_status = ?, updated_at = ?
     WHERE destination_id = ? AND service_type = ? AND service_id = ?`,
    [
      input.providerId ?? null,
      existing.imageUrl,
      input.name,
      input.description ?? null,
      decimal(input.basePrice),
      input.currency,
      input.status === "archived" ? existing.status : input.status,
      existing.thumbnailUrl,
      input.status === "archived" ? (existing.archivedAt ? new Date(existing.archivedAt) : new Date()) : null,
      input.status === "archived" ? (existing.status === "archived" ? existing.archivedFromStatus : existing.status) : null,
      updatedAt,
      destinationId,
      serviceType,
      serviceId,
    ],
  );

  return findInternalService(destinationId, serviceType, serviceId);
}

export async function archiveInternalService(destinationId: string, serviceType: string, serviceId: string) {
  const existing = await findInternalService(destinationId, serviceType, serviceId);

  if (!existing) {
    return null;
  }

  if (existing.status === "archived") {
    return existing;
  }

  await executeQuery(
    `UPDATE service_catalog_by_destination
     SET status = ?, archived_at = ?, archived_from_status = ?, updated_at = ?
     WHERE destination_id = ? AND service_type = ? AND service_id = ?`,
    ["archived", new Date(), existing.status, new Date(), destinationId, serviceType, serviceId],
  );

  return findInternalService(destinationId, serviceType, serviceId);
}

export async function restoreInternalService(destinationId: string, serviceType: string, serviceId: string) {
  const existing = await findInternalService(destinationId, serviceType, serviceId);

  if (!existing) {
    return null;
  }

  if (existing.status !== "archived") {
    return existing;
  }

  await executeQuery(
    `UPDATE service_catalog_by_destination
     SET status = ?, archived_at = ?, archived_from_status = ?, updated_at = ?
     WHERE destination_id = ? AND service_type = ? AND service_id = ?`,
    [existing.archivedFromStatus ?? RESTORE_FALLBACK_STATUS, null, null, new Date(), destinationId, serviceType, serviceId],
  );

  return findInternalService(destinationId, serviceType, serviceId);
}

export async function hardDeleteInternalService(destinationId: string, serviceType: string, serviceId: string) {
  const existing = await findInternalService(destinationId, serviceType, serviceId);

  if (!existing) {
    return null;
  }

  const media = await listServiceMedia(destinationId, serviceType, serviceId);

  for (const item of media) {
    await executeQuery(
      "DELETE FROM service_media_by_service WHERE destination_id = ? AND service_type = ? AND service_id = ? AND media_order = ? AND media_id = ?",
      [destinationId, serviceType, serviceId, item.mediaOrder, item.mediaId],
    );
  }

  await executeQuery(
    "DELETE FROM service_catalog_by_destination WHERE destination_id = ? AND service_type = ? AND service_id = ?",
    [destinationId, serviceType, serviceId],
  );

  return { media, service: existing };
}

export const deleteInternalService = archiveInternalService;

export async function listServiceMedia(destinationId: string, serviceType: string, serviceId: string) {
  const rows = await executeQuery<ServiceMediaRow>(
    `SELECT destination_id, service_type, service_id, media_order, media_id, media_url, thumbnail_url, title, uploaded_at, uploaded_by, is_cover
     FROM service_media_by_service
     WHERE destination_id = ? AND service_type = ? AND service_id = ?
     ORDER BY media_order ASC, media_id ASC`,
    [destinationId, serviceType, serviceId],
  );

  return rows.map(toServiceMedia);
}

export async function findServiceMedia(destinationId: string, serviceType: string, serviceId: string, mediaId: string) {
  const media = await listServiceMedia(destinationId, serviceType, serviceId);

  return media.find((item) => item.mediaId === mediaId) ?? null;
}

async function clearServiceMediaCoverFlags(destinationId: string, serviceType: string, serviceId: string) {
  const media = await listServiceMedia(destinationId, serviceType, serviceId);

  for (const item of media) {
    if (!item.isCover) {
      continue;
    }

    await executeQuery(
      "UPDATE service_media_by_service SET is_cover = ? WHERE destination_id = ? AND service_type = ? AND service_id = ? AND media_order = ? AND media_id = ?",
      [false, destinationId, serviceType, serviceId, item.mediaOrder, item.mediaId],
    );
  }
}

async function syncServiceCover(destinationId: string, serviceType: string, serviceId: string) {
  const media = await listServiceMedia(destinationId, serviceType, serviceId);
  const cover = media.find((item) => item.isCover) ?? media[0] ?? null;

  await executeQuery(
    `UPDATE service_catalog_by_destination
     SET image_url = ?, thumbnail_url = ?, updated_at = ?
     WHERE destination_id = ? AND service_type = ? AND service_id = ?`,
    [cover?.mediaUrl ?? null, cover?.thumbnailUrl ?? null, new Date(), destinationId, serviceType, serviceId],
  );
}

export async function addServiceMedia(
  destinationId: string,
  serviceType: string,
  serviceId: string,
  input: {
    isCover?: boolean;
    sourceBuffer: Buffer;
    sourceName: string;
    title?: string | null;
    uploadedBy: string;
  },
) {
  const service = await findInternalService(destinationId, serviceType, serviceId);

  if (!service) {
    return null;
  }

  const existingMedia = await listServiceMedia(destinationId, serviceType, serviceId);
  const shouldBeCover = Boolean(input.isCover) || existingMedia.length === 0 || !service.imageUrl;
  const mediaId = String(uuidv7());
  const mediaOrder = existingMedia.length + 1;
  const uploadedAt = new Date();
  const stored = await storeImageAsset({
    folder: ["services", destinationId, serviceType, serviceId],
    sourceBuffer: input.sourceBuffer,
    sourceName: input.sourceName || "service-image",
  });

  if (shouldBeCover) {
    await clearServiceMediaCoverFlags(destinationId, serviceType, serviceId);
  }

  await executeQuery(
    `INSERT INTO service_media_by_service
      (destination_id, service_type, service_id, media_order, media_id, media_url, thumbnail_url, title, uploaded_at, uploaded_by, is_cover)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      destinationId,
      serviceType,
      serviceId,
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
    await syncServiceCover(destinationId, serviceType, serviceId);
  }

  return findServiceMedia(destinationId, serviceType, serviceId, mediaId);
}

export async function setServiceMediaCover(destinationId: string, serviceType: string, serviceId: string, mediaId: string) {
  const target = await findServiceMedia(destinationId, serviceType, serviceId, mediaId);

  if (!target) {
    return null;
  }

  await clearServiceMediaCoverFlags(destinationId, serviceType, serviceId);
  await executeQuery(
    "UPDATE service_media_by_service SET is_cover = ? WHERE destination_id = ? AND service_type = ? AND service_id = ? AND media_order = ? AND media_id = ?",
    [true, destinationId, serviceType, serviceId, target.mediaOrder, mediaId],
  );
  await syncServiceCover(destinationId, serviceType, serviceId);

  return findServiceMedia(destinationId, serviceType, serviceId, mediaId);
}

export async function deleteServiceMedia(destinationId: string, serviceType: string, serviceId: string, mediaId: string) {
  const existing = await findServiceMedia(destinationId, serviceType, serviceId, mediaId);

  if (!existing) {
    return null;
  }

  await executeQuery(
    "DELETE FROM service_media_by_service WHERE destination_id = ? AND service_type = ? AND service_id = ? AND media_order = ? AND media_id = ?",
    [destinationId, serviceType, serviceId, existing.mediaOrder, mediaId],
  );
  await syncServiceCover(destinationId, serviceType, serviceId);

  return existing;
}
