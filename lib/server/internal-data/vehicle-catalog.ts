import "server-only";

import { rm } from "node:fs/promises";
import path from "node:path";
import { uuidv7 } from "uuidv7";

import { executeQuery } from "@/lib/server/scylla";
import { storeImageAsset } from "@/lib/server/media-storage";
import type { VehicleCatalogMutationRequest } from "@/lib/shared/internal";

import {
  toVehicleCatalogItem,
  toVehicleCatalogMedia,
  type VehicleCatalogMediaRow,
  type VehicleCatalogRow,
} from "./shared";

const CATALOG_BUCKET = "all";
const ACTIVE_RESTORE_STATUS = "inactive";

function vehicleCatalogColumns() {
  return `catalog_bucket, vehicle_catalog_id, archived_at, archived_from_status, image_url, label,
          vehicle_type, vehicle_model, vehicle_capacity, status, thumbnail_url, updated_at`;
}

function toAbsolutePublicPath(publicUrl: string) {
  return path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, ""));
}

async function findNextCover(vehicleCatalogId: string) {
  const media = await listVehicleCatalogMedia(vehicleCatalogId);

  return media.find((item) => item.isCover) ?? media[0] ?? null;
}

async function syncVehicleCatalogCover(vehicleCatalogId: string) {
  const cover = await findNextCover(vehicleCatalogId);

  await executeQuery(
    `UPDATE vehicle_catalog_by_bucket
     SET image_url = ?, thumbnail_url = ?, updated_at = ?
     WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
    [cover?.mediaUrl ?? null, cover?.thumbnailUrl ?? null, new Date(), CATALOG_BUCKET, vehicleCatalogId],
  );

  return findInternalVehicleCatalog(vehicleCatalogId);
}

export async function listInternalVehicleCatalog(status?: string) {
  const rows = await executeQuery<VehicleCatalogRow>(
    `SELECT ${vehicleCatalogColumns()}
     FROM vehicle_catalog_by_bucket
     WHERE catalog_bucket = ?`,
    [CATALOG_BUCKET],
  );

  const catalog = rows
    .map(toVehicleCatalogItem)
    .filter((item) => (status ? item.status === status : item.status !== "archived"))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return catalog;
}

export async function findInternalVehicleCatalog(vehicleCatalogId: string) {
  const rows = await executeQuery<VehicleCatalogRow>(
    `SELECT ${vehicleCatalogColumns()}
     FROM vehicle_catalog_by_bucket
     WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
    [CATALOG_BUCKET, vehicleCatalogId],
  );

  return rows[0] ? toVehicleCatalogItem(rows[0]) : null;
}

export async function createInternalVehicleCatalog(input: VehicleCatalogMutationRequest) {
  const vehicleCatalogId = String(uuidv7());
  const updatedAt = new Date();

  await executeQuery(
    `INSERT INTO vehicle_catalog_by_bucket
      (catalog_bucket, vehicle_catalog_id, archived_at, archived_from_status, image_url, label,
       vehicle_type, vehicle_model, vehicle_capacity, status, thumbnail_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      CATALOG_BUCKET,
      vehicleCatalogId,
      null,
      null,
      null,
      input.label,
      input.vehicleType,
      input.vehicleModel,
      input.vehicleCapacity,
      input.status === "archived" ? ACTIVE_RESTORE_STATUS : input.status,
      null,
      updatedAt,
    ],
  );

  return findInternalVehicleCatalog(vehicleCatalogId);
}

export async function updateInternalVehicleCatalog(vehicleCatalogId: string, input: VehicleCatalogMutationRequest) {
  const existing = await findInternalVehicleCatalog(vehicleCatalogId);

  if (!existing) {
    return null;
  }

  await executeQuery(
    `UPDATE vehicle_catalog_by_bucket
     SET label = ?, vehicle_type = ?, vehicle_model = ?, vehicle_capacity = ?, status = ?, archived_at = ?, archived_from_status = ?, updated_at = ?
     WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
    [
      input.label,
      input.vehicleType,
      input.vehicleModel,
      input.vehicleCapacity,
      input.status === "archived" ? existing.status : input.status,
      input.status === "archived" ? (existing.archivedAt ? new Date(existing.archivedAt) : new Date()) : null,
      input.status === "archived" ? (existing.status === "archived" ? existing.archivedFromStatus : existing.status) : null,
      new Date(),
      CATALOG_BUCKET,
      vehicleCatalogId,
    ],
  );

  return findInternalVehicleCatalog(vehicleCatalogId);
}

export async function archiveInternalVehicleCatalog(vehicleCatalogId: string) {
  const existing = await findInternalVehicleCatalog(vehicleCatalogId);

  if (!existing) {
    return null;
  }

  if (existing.status === "archived") {
    return existing;
  }

  await executeQuery(
    `UPDATE vehicle_catalog_by_bucket
     SET status = ?, archived_at = ?, archived_from_status = ?, updated_at = ?
     WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
    ["archived", new Date(), existing.status, new Date(), CATALOG_BUCKET, vehicleCatalogId],
  );

  return findInternalVehicleCatalog(vehicleCatalogId);
}

export async function restoreInternalVehicleCatalog(vehicleCatalogId: string) {
  const existing = await findInternalVehicleCatalog(vehicleCatalogId);

  if (!existing) {
    return null;
  }

  if (existing.status !== "archived") {
    return existing;
  }

  await executeQuery(
    `UPDATE vehicle_catalog_by_bucket
     SET status = ?, archived_at = ?, archived_from_status = ?, updated_at = ?
     WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
    [existing.archivedFromStatus ?? ACTIVE_RESTORE_STATUS, null, null, new Date(), CATALOG_BUCKET, vehicleCatalogId],
  );

  return findInternalVehicleCatalog(vehicleCatalogId);
}

export async function hardDeleteInternalVehicleCatalog(vehicleCatalogId: string) {
  const existing = await findInternalVehicleCatalog(vehicleCatalogId);

  if (!existing) {
    return null;
  }

  const media = await listVehicleCatalogMedia(vehicleCatalogId);

  for (const item of media) {
    await executeQuery(
      "DELETE FROM vehicle_catalog_media_by_catalog WHERE vehicle_catalog_id = ? AND media_order = ? AND media_id = ?",
      [vehicleCatalogId, item.mediaOrder, item.mediaId],
    );
  }

  await executeQuery("DELETE FROM vehicle_catalog_by_bucket WHERE catalog_bucket = ? AND vehicle_catalog_id = ?", [
    CATALOG_BUCKET,
    vehicleCatalogId,
  ]);

  return {
    catalogItem: existing,
    media,
  };
}

export async function listVehicleCatalogMedia(vehicleCatalogId: string) {
  const rows = await executeQuery<VehicleCatalogMediaRow>(
    `SELECT vehicle_catalog_id, media_order, media_id, media_url, thumbnail_url, title, uploaded_at, uploaded_by, is_cover
     FROM vehicle_catalog_media_by_catalog
     WHERE vehicle_catalog_id = ?
     ORDER BY media_order ASC, media_id ASC`,
    [vehicleCatalogId],
  );

  return rows.map(toVehicleCatalogMedia);
}

export async function findVehicleCatalogMedia(vehicleCatalogId: string, mediaId: string) {
  const media = await listVehicleCatalogMedia(vehicleCatalogId);

  return media.find((item) => item.mediaId === mediaId) ?? null;
}

export async function addVehicleCatalogMedia(
  vehicleCatalogId: string,
  input: {
    isCover?: boolean;
    sourceBuffer: Buffer;
    sourceName: string;
    title?: string | null;
    uploadedBy: string;
  },
) {
  const existing = await findInternalVehicleCatalog(vehicleCatalogId);

  if (!existing) {
    return null;
  }

  const existingMedia = await listVehicleCatalogMedia(vehicleCatalogId);
  const shouldBeCover = Boolean(input.isCover) || existingMedia.length === 0 || !existing.imageUrl;
  const mediaId = String(uuidv7());
  const mediaOrder = existingMedia.length + 1;
  const uploadedAt = new Date();
  const stored = await storeImageAsset({
    folder: ["vehicle-catalog", vehicleCatalogId],
    sourceBuffer: input.sourceBuffer,
    sourceName: input.sourceName || "vehicle-image",
  });

  if (shouldBeCover) {
    await clearVehicleCatalogMediaCoverFlags(vehicleCatalogId);
  }

  await executeQuery(
    `INSERT INTO vehicle_catalog_media_by_catalog
      (vehicle_catalog_id, media_order, media_id, media_url, thumbnail_url, title, uploaded_at, uploaded_by, is_cover)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      vehicleCatalogId,
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
      `UPDATE vehicle_catalog_by_bucket
       SET image_url = ?, thumbnail_url = ?, updated_at = ?
       WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
      [stored.fullUrl, stored.thumbnailUrl, uploadedAt, CATALOG_BUCKET, vehicleCatalogId],
    );
  }

  return findVehicleCatalogMedia(vehicleCatalogId, mediaId);
}

async function clearVehicleCatalogMediaCoverFlags(vehicleCatalogId: string) {
  const media = await listVehicleCatalogMedia(vehicleCatalogId);

  for (const item of media) {
    if (!item.isCover) {
      continue;
    }

    await executeQuery(
      "UPDATE vehicle_catalog_media_by_catalog SET is_cover = ? WHERE vehicle_catalog_id = ? AND media_order = ? AND media_id = ?",
      [false, vehicleCatalogId, item.mediaOrder, item.mediaId],
    );
  }
}

export async function setVehicleCatalogMediaCover(vehicleCatalogId: string, mediaId: string) {
  const target = await findVehicleCatalogMedia(vehicleCatalogId, mediaId);

  if (!target) {
    return null;
  }

  await clearVehicleCatalogMediaCoverFlags(vehicleCatalogId);
  await executeQuery(
    "UPDATE vehicle_catalog_media_by_catalog SET is_cover = ? WHERE vehicle_catalog_id = ? AND media_order = ? AND media_id = ?",
    [true, vehicleCatalogId, target.mediaOrder, mediaId],
  );
  await executeQuery(
    `UPDATE vehicle_catalog_by_bucket
     SET image_url = ?, thumbnail_url = ?, updated_at = ?
     WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
    [target.mediaUrl, target.thumbnailUrl, new Date(), CATALOG_BUCKET, vehicleCatalogId],
  );

  return findVehicleCatalogMedia(vehicleCatalogId, mediaId);
}

export async function deleteVehicleCatalogMedia(vehicleCatalogId: string, mediaId: string) {
  const existing = await findVehicleCatalogMedia(vehicleCatalogId, mediaId);

  if (!existing) {
    return null;
  }

  await executeQuery(
    "DELETE FROM vehicle_catalog_media_by_catalog WHERE vehicle_catalog_id = ? AND media_order = ? AND media_id = ?",
    [vehicleCatalogId, existing.mediaOrder, mediaId],
  );

  await syncVehicleCatalogCover(vehicleCatalogId);

  return existing;
}

export async function setInternalVehicleCatalogImage(
  vehicleCatalogId: string,
  input: {
    sourceBuffer: Buffer;
    sourceName: string;
    uploadedBy?: string;
  },
) {
  await clearInternalVehicleCatalogImage(vehicleCatalogId);
  const media = await addVehicleCatalogMedia(vehicleCatalogId, {
    isCover: true,
    sourceBuffer: input.sourceBuffer,
    sourceName: input.sourceName,
    uploadedBy: input.uploadedBy ?? "00000000-0000-0000-0000-000000000000",
  });

  if (!media) {
    return null;
  }

  return findInternalVehicleCatalog(vehicleCatalogId);
}

export async function clearInternalVehicleCatalogImage(vehicleCatalogId: string) {
  const existing = await findInternalVehicleCatalog(vehicleCatalogId);

  if (!existing) {
    return null;
  }

  const media = await listVehicleCatalogMedia(vehicleCatalogId);

  for (const item of media) {
    await executeQuery(
      "DELETE FROM vehicle_catalog_media_by_catalog WHERE vehicle_catalog_id = ? AND media_order = ? AND media_id = ?",
      [vehicleCatalogId, item.mediaOrder, item.mediaId],
    );

    await rm(toAbsolutePublicPath(item.mediaUrl), { force: true });
    await rm(toAbsolutePublicPath(item.thumbnailUrl), { force: true });
  }

  if (existing.imageUrl) {
    await rm(toAbsolutePublicPath(existing.imageUrl), { force: true });
  }

  if (existing.thumbnailUrl) {
    await rm(toAbsolutePublicPath(existing.thumbnailUrl), { force: true });
  }

  await executeQuery(
    `UPDATE vehicle_catalog_by_bucket
     SET image_url = ?, thumbnail_url = ?, updated_at = ?
     WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
    [null, null, new Date(), CATALOG_BUCKET, vehicleCatalogId],
  );

  return findInternalVehicleCatalog(vehicleCatalogId);
}

export const deleteInternalVehicleCatalog = archiveInternalVehicleCatalog;
