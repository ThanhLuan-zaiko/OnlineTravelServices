import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { executeQuery } from "@/lib/server/scylla";
import type { TourMutationRequest } from "@/lib/shared/internal";

import {
  decimal,
  TOUR_LIST_STATUSES,
  toTour,
  type TourByIdRow,
  type TourStatusRow,
} from "./shared";

async function writeTourProjections(tourId: string, input: TourMutationRequest, createdBy: string | null) {
  const updatedAt = types.TimeUuid.now();

  await Promise.all([
    executeQuery(
      `INSERT INTO tours_by_status
        (status, updated_at, tour_id, title, destination_name, category, base_price, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [input.status, updatedAt, tourId, input.title, input.destinationName, input.category, decimal(input.basePrice), createdBy],
    ),
    executeQuery(
      `INSERT INTO tours_by_destination
        (destination_id, status, popularity_score, tour_id, title, category, base_price, duration_days, average_rating, cover_image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.destinationId,
        input.status,
        0,
        tourId,
        input.title,
        input.category,
        decimal(input.basePrice),
        input.durationDays,
        decimal("0"),
        null,
      ],
    ),
    executeQuery(
      `INSERT INTO tours_by_category
        (category, status, base_price, tour_id, title, destination_name, duration_days, average_rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.category,
        input.status,
        decimal(input.basePrice),
        tourId,
        input.title,
        input.destinationName,
        input.durationDays,
        decimal("0"),
      ],
    ),
  ]);
}

export async function listInternalTours(status?: string) {
  const statuses = status ? [status] : [...TOUR_LIST_STATUSES];
  const tourIds = new Set<string>();

  for (const currentStatus of statuses) {
    const rows = await executeQuery<TourStatusRow>(
      "SELECT tour_id FROM tours_by_status WHERE status = ? LIMIT 80",
      [currentStatus],
    );

    for (const row of rows) {
      tourIds.add(String(row.tour_id));
    }
  }

  const tours = await Promise.all([...tourIds].map((tourId) => findInternalTour(tourId)));

  return tours
    .filter((tour): tour is NonNullable<Awaited<ReturnType<typeof findInternalTour>>> => Boolean(tour))
    .filter((tour) => !status || tour.status === status)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function findInternalTour(tourId: string) {
  const rows = await executeQuery<TourByIdRow>(
    `SELECT tour_id, title, slug, destination_id, destination_name, category, status, tour_type,
            vehicle_catalog_label, vehicle_catalog_id, vehicle_type, vehicle_model, vehicle_capacity,
            base_price, currency, duration_days, duration_nights, max_guests, min_guests,
            average_rating, rating_count, vip_only, created_by, approved_by, created_at,
            updated_at, published_at, summary, included_services, excluded_services, cover_image_url
     FROM tours_by_id
     WHERE tour_id = ?`,
    [tourId],
  );

  return rows[0] ? toTour(rows[0]) : null;
}

export async function createInternalTour(input: TourMutationRequest, actorUserId: string) {
  const tourId = String(uuidv7());
  const now = new Date();
  const publishedAt = input.status === "published" ? now : null;

  await executeQuery(
    `INSERT INTO tours_by_id
      (tour_id, title, slug, destination_id, destination_name, category, status, tour_type,
       vehicle_catalog_label, vehicle_catalog_id, vehicle_type, vehicle_model, vehicle_capacity,
       base_price, currency, duration_days, duration_nights, max_guests, min_guests,
       average_rating, rating_count, vip_only, created_by, approved_by, created_at,
       updated_at, published_at, summary, included_services, excluded_services, cover_image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      tourId,
      input.title,
      input.slug,
      input.destinationId,
      input.destinationName,
      input.category,
      input.status,
      input.tourType,
      input.vehicleCatalogLabel,
      input.vehicleCatalogId,
      input.vehicleType,
      input.vehicleModel,
      input.vehicleCapacity,
      decimal(input.basePrice),
      input.currency,
      input.durationDays,
      input.durationNights,
      input.maxGuests,
      input.minGuests,
      decimal("0"),
      0,
      input.vipOnly,
      actorUserId,
      null,
      now,
      now,
      publishedAt,
      input.summary ?? null,
      input.includedServices,
      input.excludedServices,
      null,
    ],
  );
  await writeTourProjections(tourId, input, actorUserId);

  return findInternalTour(tourId);
}

export async function updateInternalTour(tourId: string, input: TourMutationRequest) {
  const existing = await findInternalTour(tourId);

  if (!existing) {
    return null;
  }

  const now = new Date();
  const publishedAt = input.status === "published" ? existing.publishedAt ?? now.toISOString() : existing.publishedAt;

  await executeQuery(
    `UPDATE tours_by_id
     SET title = ?, slug = ?, destination_id = ?, destination_name = ?, category = ?, status = ?,
         tour_type = ?, vehicle_catalog_label = ?, vehicle_catalog_id = ?, vehicle_type = ?, vehicle_model = ?, vehicle_capacity = ?,
         base_price = ?, currency = ?, duration_days = ?, duration_nights = ?,
         max_guests = ?, min_guests = ?, vip_only = ?, updated_at = ?, published_at = ?,
         summary = ?, included_services = ?, excluded_services = ?
     WHERE tour_id = ?`,
    [
      input.title,
      input.slug,
      input.destinationId,
      input.destinationName,
      input.category,
      input.status,
      input.tourType,
      input.vehicleCatalogLabel,
      input.vehicleCatalogId,
      input.vehicleType,
      input.vehicleModel,
      input.vehicleCapacity,
      decimal(input.basePrice),
      input.currency,
      input.durationDays,
      input.durationNights,
      input.maxGuests,
      input.minGuests,
      input.vipOnly,
      now,
      publishedAt ? new Date(publishedAt) : null,
      input.summary ?? null,
      input.includedServices,
      input.excludedServices,
      tourId,
    ],
  );
  await writeTourProjections(tourId, input, existing.createdBy);

  return findInternalTour(tourId);
}

export async function archiveInternalTour(tourId: string) {
  const existing = await findInternalTour(tourId);

  if (!existing) {
    return null;
  }

  const archivedInput: TourMutationRequest = {
    ...existing,
    status: "archived",
  };

  return updateInternalTour(tourId, archivedInput);
}
