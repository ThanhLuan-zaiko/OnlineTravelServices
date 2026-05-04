import "server-only";

import { executeQuery } from "@/lib/server/scylla";
import type { ItineraryMutationRequest } from "@/lib/shared/internal";

import { toItineraryItem, type ItineraryRow } from "./shared";

export async function listItineraryByTour(tourId: string) {
  const rows = await executeQuery<ItineraryRow>(
    `SELECT day_number, item_order, title, description, location_name, start_time, end_time, service_type
     FROM tour_itinerary_items
     WHERE tour_id = ?`,
    [tourId],
  );

  return rows.map(toItineraryItem);
}

export async function upsertItineraryItem(tourId: string, input: ItineraryMutationRequest) {
  await executeQuery(
    `INSERT INTO tour_itinerary_items
      (tour_id, day_number, item_order, title, description, location_name, start_time, end_time, service_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tourId,
      input.dayNumber,
      input.itemOrder,
      input.title,
      input.description ?? null,
      input.locationName ?? null,
      input.startTime ?? null,
      input.endTime ?? null,
      input.serviceType ?? null,
    ],
  );

  return {
    dayNumber: input.dayNumber,
    description: input.description ?? null,
    endTime: input.endTime ?? null,
    itemOrder: input.itemOrder,
    locationName: input.locationName ?? null,
    serviceType: input.serviceType ?? null,
    startTime: input.startTime ?? null,
    title: input.title,
  };
}

export async function deleteItineraryItem(tourId: string, dayNumber: number, itemOrder: number) {
  await executeQuery(
    "DELETE FROM tour_itinerary_items WHERE tour_id = ? AND day_number = ? AND item_order = ?",
    [tourId, dayNumber, itemOrder],
  );
}
