import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type { TourMutationRequest } from "@/lib/shared/internal";

import {
  decimal,
  TOUR_LIST_STATUSES,
  toTour,
  type TourByIdRow,
  type TourStatusRow,
} from "./shared";
import { listTourMedia } from "./tour-media";

const DEFAULT_TOUR_PAGE_SIZE = 8;
const MAX_TOUR_PAGE_SIZE = 48;
const SEARCH_SCAN_MULTIPLIER = 4;

function clampTourPageSize(limit?: number) {
  if (!limit || !Number.isFinite(limit)) {
    return DEFAULT_TOUR_PAGE_SIZE;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_TOUR_PAGE_SIZE);
}

function tourMatchesSearch(tour: NonNullable<Awaited<ReturnType<typeof findInternalTour>>>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [tour.title, tour.slug, tour.destinationName, tour.category, tour.tourType, tour.tourId].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

async function writeTourProjections(tourId: string, input: TourMutationRequest, createdBy: string | null) {
  const updatedAt = String(types.TimeUuid.now());

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

export async function listInternalToursPage(
  status: "archived" | "draft" | "published",
  options?: {
    cursor?: string | null;
    limit?: number;
    query?: string;
  },
) {
  const limit = clampTourPageSize(options?.limit);
  const query = options?.query?.trim();
  const fetchSize = query ? Math.min(limit * SEARCH_SCAN_MULTIPLIER, MAX_TOUR_PAGE_SIZE * SEARCH_SCAN_MULTIPLIER) : limit;
  const tours: NonNullable<Awaited<ReturnType<typeof findInternalTour>>>[] = [];
  let pageState: string | Buffer | null = options?.cursor ?? null;

  do {
    const page: { pageState: string | Buffer | null; rows: TourStatusRow[] } = await executePagedQuery<TourStatusRow>(
      "SELECT tour_id FROM tours_by_status WHERE status = ?",
      [status],
      { fetchSize, pageState },
    );

    pageState = page.pageState;
    const pageTours = (await Promise.all(page.rows.map((row) => findInternalTour(String(row.tour_id)))))
      .filter((tour): tour is NonNullable<Awaited<ReturnType<typeof findInternalTour>>> => Boolean(tour))
      .filter((tour) => tour.status === status)
      .filter((tour) => tourMatchesSearch(tour, query));

    tours.push(...pageTours);
  } while (tours.length < limit && pageState);

  return {
    nextCursor: pageState ? String(pageState) : null,
    tours: tours.slice(0, limit),
  };
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

export async function restoreInternalTour(tourId: string) {
  const existing = await findInternalTour(tourId);

  if (!existing) {
    return null;
  }

  if (existing.status !== "archived") {
    return existing;
  }

  return updateInternalTour(tourId, {
    ...existing,
    status: "draft",
  });
}

export async function hardDeleteInternalTour(tourId: string) {
  const existing = await findInternalTour(tourId);

  if (!existing) {
    return null;
  }

  const media = await listTourMedia(tourId);

  for (const item of media) {
    await executeQuery(
      "DELETE FROM tour_media_by_tour WHERE tour_id = ? AND media_order = ? AND media_id = ?",
      [tourId, item.mediaOrder, item.mediaId],
    );
  }

  await executeQuery("DELETE FROM tours_by_id WHERE tour_id = ?", [tourId]);

  return { media, tour: existing };
}
