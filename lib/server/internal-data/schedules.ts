import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { executeQuery } from "@/lib/server/scylla";
import type { ScheduleMutationRequest } from "@/lib/shared/internal";

import { decimal, localDateToString, toSchedule, type ScheduleRow } from "./shared";

export async function listSchedulesByTour(tourId: string) {
  const rows = await executeQuery<ScheduleRow>(
    `SELECT departure_date, schedule_id, status, departure_time, available_slots, booked_slots,
            price, currency, guide_staff_id
     FROM tour_schedules_by_tour
     WHERE tour_id = ?`,
    [tourId],
  );

  return rows.map(toSchedule);
}

export async function createSchedule(tourId: string, input: ScheduleMutationRequest) {
  const scheduleId = String(uuidv7());

  await executeQuery(
    `INSERT INTO tour_schedules_by_tour
      (tour_id, departure_date, schedule_id, status, departure_time, available_slots, booked_slots, price, currency, guide_staff_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tourId,
      types.LocalDate.fromString(input.departureDate),
      scheduleId,
      input.status,
      input.departureTime,
      input.availableSlots,
      input.bookedSlots,
      decimal(input.price),
      input.currency,
      input.guideStaffId ?? null,
    ],
  );

  return { ...input, scheduleId };
}

export async function updateSchedule(tourId: string, scheduleId: string, input: ScheduleMutationRequest) {
  await executeQuery(
    `UPDATE tour_schedules_by_tour
     SET status = ?, departure_time = ?, available_slots = ?, booked_slots = ?, price = ?, currency = ?, guide_staff_id = ?
     WHERE tour_id = ? AND departure_date = ? AND schedule_id = ?`,
    [
      input.status,
      input.departureTime,
      input.availableSlots,
      input.bookedSlots,
      decimal(input.price),
      input.currency,
      input.guideStaffId ?? null,
      tourId,
      types.LocalDate.fromString(input.departureDate),
      scheduleId,
    ],
  );

  return { ...input, scheduleId };
}

export async function deleteSchedule(tourId: string, scheduleId: string, departureDate: string) {
  await executeQuery(
    "DELETE FROM tour_schedules_by_tour WHERE tour_id = ? AND departure_date = ? AND schedule_id = ?",
    [tourId, types.LocalDate.fromString(departureDate), scheduleId],
  );
}
