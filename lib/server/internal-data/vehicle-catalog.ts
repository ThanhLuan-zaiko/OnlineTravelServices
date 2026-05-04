import "server-only";

import { rm } from "node:fs/promises";
import path from "node:path";
import { uuidv7 } from "uuidv7";

import { executeQuery } from "@/lib/server/scylla";
import type { VehicleCatalogMutationRequest } from "@/lib/shared/internal";
import { storeImageAsset } from "@/lib/server/media-storage";

import { toVehicleCatalogItem, type VehicleCatalogRow } from "./shared";

const CATALOG_BUCKET = "all";

export async function listInternalVehicleCatalog(status?: string) {
  const rows = await executeQuery<VehicleCatalogRow>(
    `SELECT catalog_bucket, vehicle_catalog_id, image_url, label, vehicle_type, vehicle_model, vehicle_capacity, status, thumbnail_url, updated_at
     FROM vehicle_catalog_by_bucket
     WHERE catalog_bucket = ?`,
    [CATALOG_BUCKET],
  );

  const catalog = rows
    .map(toVehicleCatalogItem)
    .filter((item) => !status || item.status === status)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  return catalog;
}

export async function findInternalVehicleCatalog(vehicleCatalogId: string) {
  const rows = await executeQuery<VehicleCatalogRow>(
    `SELECT catalog_bucket, vehicle_catalog_id, image_url, label, vehicle_type, vehicle_model, vehicle_capacity, status, thumbnail_url, updated_at
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
      (catalog_bucket, vehicle_catalog_id, image_url, label, vehicle_type, vehicle_model, vehicle_capacity, status, thumbnail_url, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      CATALOG_BUCKET,
      vehicleCatalogId,
      null,
      input.label,
      input.vehicleType,
      input.vehicleModel,
      input.vehicleCapacity,
      input.status,
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
     SET label = ?, vehicle_type = ?, vehicle_model = ?, vehicle_capacity = ?, status = ?, updated_at = ?
     WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
    [
      input.label,
      input.vehicleType,
      input.vehicleModel,
      input.vehicleCapacity,
      input.status,
      new Date(),
      CATALOG_BUCKET,
      vehicleCatalogId,
    ],
  );

  return findInternalVehicleCatalog(vehicleCatalogId);
}

export async function deleteInternalVehicleCatalog(vehicleCatalogId: string) {
  const existing = await findInternalVehicleCatalog(vehicleCatalogId);

  if (!existing) {
    return null;
  }

  await executeQuery("DELETE FROM vehicle_catalog_by_bucket WHERE catalog_bucket = ? AND vehicle_catalog_id = ?", [
    CATALOG_BUCKET,
    vehicleCatalogId,
  ]);

  return existing;
}

function toAbsolutePublicPath(publicUrl: string) {
  return path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, ""));
}

export async function setInternalVehicleCatalogImage(
  vehicleCatalogId: string,
  input: {
    sourceBuffer: Buffer;
    sourceName: string;
  },
) {
  const existing = await findInternalVehicleCatalog(vehicleCatalogId);

  if (!existing) {
    return null;
  }

  if (existing.imageUrl) {
    await rm(toAbsolutePublicPath(existing.imageUrl), { force: true });
  }

  if (existing.thumbnailUrl) {
    await rm(toAbsolutePublicPath(existing.thumbnailUrl), { force: true });
  }

  const stored = await storeImageAsset({
    folder: ["vehicle-catalog", vehicleCatalogId],
    sourceBuffer: input.sourceBuffer,
    sourceName: input.sourceName,
  });

  await executeQuery(
    `UPDATE vehicle_catalog_by_bucket
     SET image_url = ?, thumbnail_url = ?, updated_at = ?
     WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
    [stored.fullUrl, stored.thumbnailUrl, new Date(), CATALOG_BUCKET, vehicleCatalogId],
  );

  return findInternalVehicleCatalog(vehicleCatalogId);
}

export async function clearInternalVehicleCatalogImage(vehicleCatalogId: string) {
  const existing = await findInternalVehicleCatalog(vehicleCatalogId);

  if (!existing) {
    return null;
  }

  await executeQuery(
    `UPDATE vehicle_catalog_by_bucket
     SET image_url = ?, thumbnail_url = ?, updated_at = ?
     WHERE catalog_bucket = ? AND vehicle_catalog_id = ?`,
    [null, null, new Date(), CATALOG_BUCKET, vehicleCatalogId],
  );

  if (existing.imageUrl) {
    await rm(toAbsolutePublicPath(existing.imageUrl), { force: true });
  }

  if (existing.thumbnailUrl) {
    await rm(toAbsolutePublicPath(existing.thumbnailUrl), { force: true });
  }

  return findInternalVehicleCatalog(vehicleCatalogId);
}
