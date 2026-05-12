import "server-only";

import { types } from "cassandra-driver";

import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import {
  type PublicTourDetail,
  type PublicTourEvent,
  type PublicTourCountry,
  type PublicTourFeed,
  type PublicTourItineraryItem,
  type PublicTourListItem,
  type PublicTourMediaItem,
  type PublicTourScheduleSummary,
} from "@/lib/shared/public-tours";
import type { InternalDestination, InternalSchedule, InternalTour } from "@/lib/shared/internal";

import { findInternalDestination } from "./internal-data/destinations";
import { listItineraryByTour } from "./internal-data/itinerary";
import { listSchedulesByTour } from "./internal-data/schedules";
import { listTourMedia } from "./internal-data/tour-media";
import { findInternalTour } from "./internal-data/tours";
import { decimalFromNumber, decimalToString, localDateToString, type TourByIdRow } from "./internal-data/shared";
import { publishPublicTourEvent } from "./public-tour-events";

const DEFAULT_PUBLIC_TOUR_PAGE_SIZE = 8;
const MAX_PUBLIC_TOUR_PAGE_SIZE = 36;

type PublicTourProjectionKeyRow = {
  country: string | null;
  country_key: string | null;
  feed: PublicTourFeed;
  published_at: Date;
  tour_id: string;
};

type PublicTourProjectionRow = {
  address: string | null;
  average_rating: unknown;
  base_price: unknown;
  category: string;
  city: string;
  country: string;
  cover_image_url: string | null;
  currency: string;
  destination_id: string;
  destination_name: string;
  duration_days: number;
  duration_nights: number;
  latitude: unknown;
  longitude: unknown;
  max_guests: number;
  min_guests: number;
  next_available_slots: number | null;
  next_departure_currency: string | null;
  next_departure_date: types.LocalDate | string | null;
  next_departure_price: unknown | null;
  next_departure_time: string | null;
  published_at: Date;
  rating_count: number | null;
  region: string;
  slug: string;
  summary: string | null;
  title: string;
  tour_id: string;
  tour_type: string;
  updated_at: Date;
  vip_only: boolean;
};

type PublicTourCountryRow = {
  country: string;
  country_key: string;
};

function clampPublicTourPageSize(limit?: number) {
  if (!Number.isFinite(limit) || !limit) {
    return DEFAULT_PUBLIC_TOUR_PAGE_SIZE;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_PUBLIC_TOUR_PAGE_SIZE);
}

function normalizeCountry(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function isDomesticCountry(country: string) {
  const normalizedCountry = normalizeCountry(country);

  return normalizedCountry === "viet nam" || normalizedCountry === "vietnam" || normalizedCountry === "vn";
}

function getCountryKey(country: string) {
  return normalizeCountry(country)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function getPublicFeeds(destination: InternalDestination): PublicTourFeed[] {
  return ["all", isDomesticCountry(destination.country) ? "domestic" : "international"];
}

function findNextOpenSchedule(schedules: InternalSchedule[]) {
  const nowDate = new Date().toISOString().slice(0, 10);

  return schedules
    .filter((schedule) => schedule.status === "open")
    .filter((schedule) => schedule.availableSlots > 0)
    .filter((schedule) => schedule.departureDate >= nowDate)
    .sort((left, right) => {
      const dateCompare = left.departureDate.localeCompare(right.departureDate);

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return left.departureTime.localeCompare(right.departureTime);
    })[0] ?? null;
}

function toPublicTourListItem(row: PublicTourProjectionRow): PublicTourListItem {
  const nextDate = row.next_departure_date ? localDateToString(row.next_departure_date) : null;

  return {
    averageRating: decimalToString(row.average_rating),
    basePrice: decimalToString(row.base_price),
    category: row.category,
    city: row.city,
    country: row.country,
    coverImageUrl: row.cover_image_url,
    currency: row.currency,
    destinationAddress: row.address,
    destinationId: String(row.destination_id),
    destinationName: row.destination_name,
    durationDays: row.duration_days,
    durationNights: row.duration_nights,
    latitude: row.latitude == null ? 0 : Number(row.latitude),
    longitude: row.longitude == null ? 0 : Number(row.longitude),
    maxGuests: row.max_guests,
    minGuests: row.min_guests,
    nextDeparture:
      nextDate && row.next_departure_time && row.next_departure_currency && row.next_departure_price != null
        ? {
            availableSlots: row.next_available_slots ?? 0,
            currency: row.next_departure_currency,
            date: nextDate,
            price: decimalToString(row.next_departure_price),
            time: row.next_departure_time,
          }
        : null,
    publishedAt: row.published_at.toISOString(),
    ratingCount: row.rating_count ?? 0,
    region: row.region,
    slug: row.slug,
    summary: row.summary,
    title: row.title,
    tourId: String(row.tour_id),
    tourType: row.tour_type,
    updatedAt: row.updated_at.toISOString(),
    vipOnly: row.vip_only,
  };
}

function toPublicMediaItem(item: Awaited<ReturnType<typeof listTourMedia>>[number]): PublicTourMediaItem {
  return {
    mediaId: item.mediaId,
    mediaType: item.mediaType,
    mediaUrl: item.mediaUrl,
    thumbnailUrl: item.thumbnailUrl,
    title: item.title,
  };
}

function toPublicScheduleSummary(schedule: InternalSchedule): PublicTourScheduleSummary {
  return {
    availableSlots: schedule.availableSlots,
    bookedSlots: schedule.bookedSlots,
    currency: schedule.currency,
    departureDate: schedule.departureDate,
    departureTime: schedule.departureTime,
    price: schedule.price,
    scheduleId: schedule.scheduleId,
    status: schedule.status,
  };
}

function toPublicItineraryItem(item: Awaited<ReturnType<typeof listItineraryByTour>>[number]): PublicTourItineraryItem {
  return {
    dayNumber: item.dayNumber,
    description: item.description,
    endTime: item.endTime,
    itemOrder: item.itemOrder,
    locationName: item.locationName,
    serviceType: item.serviceType,
    startTime: item.startTime,
    title: item.title,
  };
}

async function buildPublicTourProjection(tour: InternalTour) {
  if (tour.status !== "published") {
    return null;
  }

  const destination = await findInternalDestination(tour.destinationId);

  if (!destination || destination.status !== "published") {
    return null;
  }

  const schedules = await listSchedulesByTour(tour.tourId);
  const nextSchedule = findNextOpenSchedule(schedules);
  const publishedAt = new Date(tour.publishedAt ?? tour.updatedAt ?? tour.createdAt);
  const updatedAt = new Date(tour.updatedAt);

  return {
    destination,
    feeds: getPublicFeeds(destination),
    projection: {
      address: destination.address,
      averageRating: tour.averageRating,
      basePrice: tour.basePrice,
      category: tour.category,
      city: destination.city,
      country: destination.country,
      coverImageUrl: tour.coverImageUrl ?? destination.coverImageUrl ?? null,
      currency: tour.currency,
      destinationId: tour.destinationId,
      destinationName: tour.destinationName,
      durationDays: tour.durationDays,
      durationNights: tour.durationNights,
      latitude: destination.latitude,
      longitude: destination.longitude,
      maxGuests: tour.maxGuests,
      minGuests: tour.minGuests,
      nextAvailableSlots: nextSchedule?.availableSlots ?? null,
      nextDepartureCurrency: nextSchedule?.currency ?? null,
      nextDepartureDate: nextSchedule?.departureDate ?? null,
      nextDeparturePrice: nextSchedule?.price ?? null,
      nextDepartureTime: nextSchedule?.departureTime ?? null,
      publishedAt,
      ratingCount: tour.ratingCount,
      region: destination.region,
      slug: tour.slug,
      summary: tour.summary,
      title: tour.title,
      tourId: tour.tourId,
      tourType: tour.tourType,
      updatedAt,
      vipOnly: tour.vipOnly,
    },
  };
}

function projectionToEventTour(projection: NonNullable<Awaited<ReturnType<typeof buildPublicTourProjection>>>["projection"]): PublicTourListItem {
  return {
    averageRating: projection.averageRating,
    basePrice: projection.basePrice,
    category: projection.category,
    city: projection.city,
    country: projection.country,
    coverImageUrl: projection.coverImageUrl,
    currency: projection.currency,
    destinationAddress: projection.address ?? null,
    destinationId: projection.destinationId,
    destinationName: projection.destinationName,
    durationDays: projection.durationDays,
    durationNights: projection.durationNights,
    latitude: projection.latitude,
    longitude: projection.longitude,
    maxGuests: projection.maxGuests,
    minGuests: projection.minGuests,
    nextDeparture:
      projection.nextDepartureDate &&
      projection.nextDepartureTime &&
      projection.nextDepartureCurrency &&
      projection.nextDeparturePrice
        ? {
            availableSlots: projection.nextAvailableSlots ?? 0,
            currency: projection.nextDepartureCurrency,
            date: projection.nextDepartureDate,
            price: projection.nextDeparturePrice,
            time: projection.nextDepartureTime,
          }
        : null,
    publishedAt: projection.publishedAt.toISOString(),
    ratingCount: projection.ratingCount,
    region: projection.region,
    slug: projection.slug,
    summary: projection.summary ?? null,
    title: projection.title,
    tourId: projection.tourId,
    tourType: projection.tourType,
    updatedAt: projection.updatedAt.toISOString(),
    vipOnly: projection.vipOnly,
  };
}

function projectionInsertParams(
  feed: PublicTourFeed,
  projection: NonNullable<Awaited<ReturnType<typeof buildPublicTourProjection>>>["projection"],
  countryKey?: string,
) {
  const baseParams = [
    feed,
    ...(countryKey ? [countryKey] : []),
    projection.publishedAt,
    projection.tourId,
    projection.slug,
    projection.title,
    projection.summary,
    projection.destinationId,
    projection.destinationName,
    projection.country,
    projection.region,
    projection.city,
    projection.address,
    decimalFromNumber(projection.latitude),
    decimalFromNumber(projection.longitude),
    projection.category,
    projection.tourType,
    projection.basePrice,
    projection.currency,
    projection.durationDays,
    projection.durationNights,
    projection.minGuests,
    projection.maxGuests,
    projection.averageRating,
    projection.ratingCount,
    projection.vipOnly,
    projection.coverImageUrl,
    projection.nextDepartureDate ? types.LocalDate.fromString(projection.nextDepartureDate) : null,
    projection.nextDepartureTime,
    projection.nextDeparturePrice,
    projection.nextDepartureCurrency,
    projection.nextAvailableSlots,
    projection.updatedAt,
  ];

  return baseParams;
}

async function listProjectionKeys(tourId: string) {
  return executeQuery<PublicTourProjectionKeyRow>(
    `SELECT tour_id, feed, published_at, country_key, country
     FROM public_tour_projection_keys_by_tour
     WHERE tour_id = ?`,
    [tourId],
  );
}

async function removePublicTourProjectionKeys(keys: PublicTourProjectionKeyRow[]) {
  const countryRefreshTargets = new Map<string, { country: string; countryKey: string; feed: PublicTourFeed }>();

  await Promise.all(
    keys.flatMap((key) => {
      const queries = [
        executeQuery(
          "DELETE FROM public_tours_by_feed WHERE feed = ? AND published_at = ? AND tour_id = ?",
          [key.feed, key.published_at, key.tour_id],
        ),
        executeQuery(
          "DELETE FROM public_tour_projection_keys_by_tour WHERE tour_id = ? AND feed = ?",
          [key.tour_id, key.feed],
        ),
      ];

      if (key.country_key && key.country && key.feed !== "all") {
        countryRefreshTargets.set(`${key.feed}:${key.country_key}`, {
          country: key.country,
          countryKey: key.country_key,
          feed: key.feed,
        });
        queries.push(
          executeQuery(
            "DELETE FROM public_tours_by_country WHERE feed = ? AND country_key = ? AND published_at = ? AND tour_id = ?",
            [key.feed, key.country_key, key.published_at, key.tour_id],
          ),
        );
      }

      return queries;
    }),
  );

  await Promise.all([...countryRefreshTargets.values()].map(refreshPublicTourCountry));
}

async function refreshPublicTourCountry(input: { country: string; countryKey: string; feed: PublicTourFeed }) {
  const rows = await executeQuery<{ tour_id: string }>(
    "SELECT tour_id FROM public_tours_by_country WHERE feed = ? AND country_key = ? LIMIT 1",
    [input.feed, input.countryKey],
  );

  if (rows.length > 0) {
    await executeQuery(
      `INSERT INTO public_tour_countries_by_feed
        (feed, country_key, country, updated_at)
       VALUES (?, ?, ?, ?)`,
      [input.feed, input.countryKey, input.country, new Date()],
    );
    return;
  }

  await executeQuery(
    "DELETE FROM public_tour_countries_by_feed WHERE feed = ? AND country_key = ?",
    [input.feed, input.countryKey],
  );
}

export async function syncPublicTourProjection(tourId: string) {
  const existingKeys = await listProjectionKeys(tourId);

  if (existingKeys.length > 0) {
    await removePublicTourProjectionKeys(existingKeys);
  }

  const tour = await findInternalTour(tourId);
  const publicProjection = tour ? await buildPublicTourProjection(tour) : null;

  if (!publicProjection) {
    if (existingKeys.length > 0) {
      await publishPublicTourEvent({
        feeds: [...new Set(existingKeys.map((key) => key.feed))],
        tourId,
        type: "tour:removed",
      });
    }

    return null;
  }

  const { feeds, projection } = publicProjection;
  const countryKey = getCountryKey(projection.country);
  const countryFeeds = feeds.filter((feed) => feed !== "all");

  await Promise.all(
    [
      ...feeds.map((feed) =>
        executeQuery(
        `INSERT INTO public_tours_by_feed
          (feed, published_at, tour_id, slug, title, summary, destination_id, destination_name,
           country, region, city, address, latitude, longitude, category, tour_type, base_price,
           currency, duration_days, duration_nights, min_guests, max_guests, average_rating,
           rating_count, vip_only, cover_image_url, next_departure_date, next_departure_time,
           next_departure_price, next_departure_currency, next_available_slots, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          projectionInsertParams(feed, projection),
        ),
      ),
      ...countryFeeds.map((feed) =>
        executeQuery(
          `INSERT INTO public_tours_by_country
            (feed, country_key, published_at, tour_id, slug, title, summary, destination_id, destination_name,
             country, region, city, address, latitude, longitude, category, tour_type, base_price,
             currency, duration_days, duration_nights, min_guests, max_guests, average_rating,
             rating_count, vip_only, cover_image_url, next_departure_date, next_departure_time,
             next_departure_price, next_departure_currency, next_available_slots, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          projectionInsertParams(feed, projection, countryKey),
        ),
      ),
      ...countryFeeds.map((feed) =>
        executeQuery(
          `INSERT INTO public_tour_countries_by_feed
            (feed, country_key, country, updated_at)
           VALUES (?, ?, ?, ?)`,
          [feed, countryKey, projection.country, new Date()],
        ),
      ),
      ...feeds.map((feed) =>
        executeQuery(
        `INSERT INTO public_tour_projection_keys_by_tour
          (tour_id, feed, published_at, country_key, country)
         VALUES (?, ?, ?, ?, ?)`,
          [
            projection.tourId,
            feed,
            projection.publishedAt,
            feed === "all" ? null : countryKey,
            feed === "all" ? null : projection.country,
          ],
        ),
      ),
    ],
  );

  const event: PublicTourEvent = {
    feeds,
    tour: projectionToEventTour(projection),
    type: existingKeys.length > 0 ? "tour:updated" : "tour:published",
  };

  await publishPublicTourEvent(event);

  return event.tour;
}

export async function syncPublicToursForDestination(destinationId: string) {
  const rows = await executeQuery<{ tour_id: string }>(
    "SELECT tour_id FROM tours_by_destination WHERE destination_id = ?",
    [destinationId],
  );
  const tourIds = [...new Set(rows.map((row) => String(row.tour_id)))];

  await Promise.all(tourIds.map((tourId) => syncPublicTourProjection(tourId)));
}

export async function listPublicToursPage(
  feed: PublicTourFeed,
  options?: {
    countryKey?: string | null;
    cursor?: string | null;
    limit?: number;
  },
) {
  const limit = clampPublicTourPageSize(options?.limit);
  const countryKey = options?.countryKey?.trim();
  const params = countryKey ? [feed, countryKey] : [feed];
  const query = countryKey
    ? `SELECT feed, country_key, published_at, tour_id, slug, title, summary, destination_id, destination_name,
              country, region, city, address, latitude, longitude, category, tour_type, base_price,
              currency, duration_days, duration_nights, min_guests, max_guests, average_rating,
              rating_count, vip_only, cover_image_url, next_departure_date, next_departure_time,
              next_departure_price, next_departure_currency, next_available_slots, updated_at
       FROM public_tours_by_country
       WHERE feed = ? AND country_key = ?`
    : `SELECT feed, published_at, tour_id, slug, title, summary, destination_id, destination_name,
              country, region, city, address, latitude, longitude, category, tour_type, base_price,
              currency, duration_days, duration_nights, min_guests, max_guests, average_rating,
              rating_count, vip_only, cover_image_url, next_departure_date, next_departure_time,
              next_departure_price, next_departure_currency, next_available_slots, updated_at
       FROM public_tours_by_feed
       WHERE feed = ?`;
  const page = await executePagedQuery<PublicTourProjectionRow>(
    query,
    params,
    {
      fetchSize: limit,
      pageState: options?.cursor ?? undefined,
    },
  );

  return {
    nextCursor: page.pageState ? String(page.pageState) : null,
    tours: page.rows.slice(0, limit).map(toPublicTourListItem),
  };
}

export async function listPublicTourCountries(feed: PublicTourFeed): Promise<PublicTourCountry[]> {
  if (feed === "all") {
    return [];
  }

  const rows = await executeQuery<PublicTourCountryRow>(
    `SELECT country_key, country
     FROM public_tour_countries_by_feed
     WHERE feed = ?`,
    [feed],
  );

  return rows
    .map((row) => ({
      country: row.country,
      countryKey: row.country_key,
    }))
    .sort((left, right) => left.country.localeCompare(right.country, "vi"));
}

async function findTourBySlug(slug: string) {
  const rows = await executeQuery<TourByIdRow>(
    `SELECT tour_id, title, slug, destination_id, destination_name, category, status, tour_type,
            vehicle_catalog_label, vehicle_catalog_id, vehicle_type, vehicle_model, vehicle_capacity,
            base_price, currency, duration_days, duration_nights, max_guests, min_guests,
            average_rating, rating_count, vip_only, created_by, approved_by, created_at,
            updated_at, published_at, summary, included_services, excluded_services, cover_image_url
     FROM tours_by_id
     WHERE slug = ?
     LIMIT 1`,
    [slug],
  );

  if (!rows[0]) {
    return null;
  }

  return findInternalTour(String(rows[0].tour_id));
}

async function findPublicTourSource(slugOrId: string) {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId)) {
    return findInternalTour(slugOrId);
  }

  return findTourBySlug(slugOrId);
}

export async function getPublicTourDetail(slugOrId: string): Promise<PublicTourDetail | null> {
  const tour = await findPublicTourSource(slugOrId);

  if (!tour || tour.status !== "published") {
    return null;
  }

  const publicProjection = await buildPublicTourProjection(tour);

  if (!publicProjection) {
    return null;
  }

  const [media, schedules, itinerary] = await Promise.all([
    listTourMedia(tour.tourId),
    listSchedulesByTour(tour.tourId),
    listItineraryByTour(tour.tourId),
  ]);

  return {
    ...projectionToEventTour(publicProjection.projection),
    excludedServices: tour.excludedServices,
    gallery: media.map(toPublicMediaItem),
    includedServices: tour.includedServices,
    itinerary: itinerary
      .map(toPublicItineraryItem)
      .sort((left, right) => left.dayNumber - right.dayNumber || left.itemOrder - right.itemOrder),
    schedules: schedules
      .map(toPublicScheduleSummary)
      .sort((left, right) => left.departureDate.localeCompare(right.departureDate) || left.departureTime.localeCompare(right.departureTime)),
  };
}
