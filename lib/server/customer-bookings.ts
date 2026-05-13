import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { findInternalTour } from "@/lib/server/internal-data/tours";
import { executeBatch, executeConditionalQuery, executeQuery } from "@/lib/server/scylla";
import type { AuthUser } from "@/lib/shared/auth";
import type { CustomerBooking, CustomerBookingMutationRequest } from "@/lib/shared/bookings";

import { decimal, localDateToString, toSchedule, type ScheduleRow } from "./internal-data/shared";

const INITIAL_BOOKING_STATUS = "pending";
const INITIAL_PAYMENT_STATUS = "unpaid";

export class CustomerBookingError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CustomerBookingError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function bookingCodeFromId(bookingId: string, bookedAt: Date) {
  const datePart = bookedAt.toISOString().slice(0, 10).replace(/-/g, "");
  const idPart = bookingId.replace(/-/g, "").slice(-8).toUpperCase();

  return `OTS-${datePart}-${idPart}`;
}

function multiplyDecimal(value: string, multiplier: number) {
  const normalizedValue = value.trim() || "0";

  if (!/^\d+(\.\d+)?$/.test(normalizedValue)) {
    const fallback = Number(normalizedValue) * multiplier;

    return Number.isFinite(fallback) ? String(fallback) : "0";
  }

  const [integerPart, fractionPart = ""] = normalizedValue.split(".");
  const scale = fractionPart.length;
  const baseAmount = BigInt(`${integerPart}${fractionPart}` || "0");
  const product = baseAmount * BigInt(multiplier);

  if (scale === 0) {
    return product.toString();
  }

  const padded = product.toString().padStart(scale + 1, "0");
  const whole = padded.slice(0, -scale);
  const fraction = padded.slice(-scale).replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole;
}

async function findSchedule(input: {
  departureDate: string;
  scheduleId: string;
  tourId: string;
}) {
  const rows = await executeQuery<ScheduleRow>(
    `SELECT departure_date, schedule_id, status, departure_time, available_slots, booked_slots,
            price, currency, guide_staff_id
     FROM tour_schedules_by_tour
     WHERE tour_id = ? AND departure_date = ? AND schedule_id = ?`,
    [
      input.tourId,
      types.LocalDate.fromString(input.departureDate),
      input.scheduleId,
    ],
  );

  return rows[0] ? toSchedule(rows[0]) : null;
}

async function reserveScheduleSlots(input: CustomerBookingMutationRequest) {
  const schedule = await findSchedule(input);

  if (!schedule) {
    throw new CustomerBookingError("Không tìm thấy lịch khởi hành.", 404);
  }

  if (schedule.status !== "open") {
    throw new CustomerBookingError("Lịch khởi hành này chưa mở đặt chỗ.", 409);
  }

  if (schedule.availableSlots < input.guestCount) {
    throw new CustomerBookingError("Lịch khởi hành này không còn đủ chỗ, vui lòng chọn lịch khác.", 409);
  }

  const nextAvailableSlots = schedule.availableSlots - input.guestCount;
  const nextBookedSlots = schedule.bookedSlots + input.guestCount;
  const result = await executeConditionalQuery(
    `UPDATE tour_schedules_by_tour
     SET available_slots = ?, booked_slots = ?
     WHERE tour_id = ? AND departure_date = ? AND schedule_id = ?
     IF status = ? AND available_slots = ? AND booked_slots = ?`,
    [
      nextAvailableSlots,
      nextBookedSlots,
      input.tourId,
      types.LocalDate.fromString(input.departureDate),
      input.scheduleId,
      "open",
      schedule.availableSlots,
      schedule.bookedSlots,
    ],
  );

  if (!result.applied) {
    throw new CustomerBookingError("Lịch khởi hành này vừa thay đổi số chỗ, vui lòng thử lại.", 409);
  }

  return {
    schedule,
    slots: {
      availableSlots: nextAvailableSlots,
      bookedSlots: nextBookedSlots,
    },
  };
}

async function releaseScheduleSlots(input: CustomerBookingMutationRequest) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const schedule = await findSchedule(input);

    if (!schedule || schedule.bookedSlots < input.guestCount) {
      return;
    }

    const result = await executeConditionalQuery(
      `UPDATE tour_schedules_by_tour
       SET available_slots = ?, booked_slots = ?
       WHERE tour_id = ? AND departure_date = ? AND schedule_id = ?
       IF available_slots = ? AND booked_slots = ?`,
      [
        schedule.availableSlots + input.guestCount,
        schedule.bookedSlots - input.guestCount,
        input.tourId,
        types.LocalDate.fromString(input.departureDate),
        input.scheduleId,
        schedule.availableSlots,
        schedule.bookedSlots,
      ],
    );

    if (result.applied) {
      return;
    }
  }

  console.error("[customer-bookings] Failed to release reserved schedule slots.", {
    scheduleId: input.scheduleId,
    tourId: input.tourId,
  });
}

export async function createCustomerBooking(
  user: AuthUser,
  input: CustomerBookingMutationRequest,
): Promise<CustomerBooking> {
  const tour = await findInternalTour(input.tourId);

  if (!tour || tour.status !== "published") {
    throw new CustomerBookingError("Không tìm thấy tour.", 404);
  }

  if (input.guestCount < tour.minGuests || input.guestCount > tour.maxGuests) {
    throw new CustomerBookingError(`Số khách phải nằm trong khoảng ${tour.minGuests}-${tour.maxGuests}.`, 400);
  }

  const reservation = await reserveScheduleSlots(input);
  const bookingId = String(uuidv7());
  const bookedAt = new Date();
  const bookedAtTimeUuid = String(types.TimeUuid.now());
  const bookingDay = types.LocalDate.fromString(bookedAt.toISOString().slice(0, 10));
  const departureDate = types.LocalDate.fromString(input.departureDate);
  const bookingCode = bookingCodeFromId(bookingId, bookedAt);
  const totalAmount = multiplyDecimal(reservation.schedule.price, input.guestCount);
  const specialRequests = input.specialRequests ?? null;

  try {
    await executeBatch([
      {
        query: `INSERT INTO bookings_by_id
          (booking_id, user_id, tour_id, schedule_id, booking_code, status, payment_status,
           guest_count, total_amount, currency, booked_at, updated_at, departure_date,
           cancellation_reason, special_requests)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          bookingId,
          user.userId,
          input.tourId,
          input.scheduleId,
          bookingCode,
          INITIAL_BOOKING_STATUS,
          INITIAL_PAYMENT_STATUS,
          input.guestCount,
          decimal(totalAmount),
          reservation.schedule.currency,
          bookedAt,
          bookedAt,
          departureDate,
          null,
          specialRequests,
        ],
      },
      {
        query: `INSERT INTO bookings_by_user
          (user_id, booked_at, booking_id, booking_code, tour_id, tour_title, status,
           payment_status, total_amount, currency, departure_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          user.userId,
          bookedAtTimeUuid,
          bookingId,
          bookingCode,
          input.tourId,
          tour.title,
          INITIAL_BOOKING_STATUS,
          INITIAL_PAYMENT_STATUS,
          decimal(totalAmount),
          reservation.schedule.currency,
          departureDate,
        ],
      },
      {
        query: `INSERT INTO bookings_by_tour
          (tour_id, departure_date, booking_id, user_id, booking_code, status,
           guest_count, total_amount, booked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          input.tourId,
          departureDate,
          bookingId,
          user.userId,
          bookingCode,
          INITIAL_BOOKING_STATUS,
          input.guestCount,
          decimal(totalAmount),
          bookedAt,
        ],
      },
      {
        query: `INSERT INTO bookings_by_status_day
          (status, booking_day, booked_at, booking_id, user_id, tour_id,
           booking_code, payment_status, total_amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          INITIAL_BOOKING_STATUS,
          bookingDay,
          bookedAtTimeUuid,
          bookingId,
          user.userId,
          input.tourId,
          bookingCode,
          INITIAL_PAYMENT_STATUS,
          decimal(totalAmount),
        ],
      },
      {
        query: `INSERT INTO booking_status_events
          (booking_id, event_time, old_status, new_status, reason, changed_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        params: [
          bookingId,
          String(types.TimeUuid.now()),
          null,
          INITIAL_BOOKING_STATUS,
          "Khách hàng tạo booking.",
          user.userId,
        ],
      },
    ]);
  } catch (error) {
    await releaseScheduleSlots(input);
    throw error;
  }

  return {
    bookedAt: bookedAt.toISOString(),
    bookingCode,
    bookingId,
    currency: reservation.schedule.currency,
    departureDate: localDateToString(departureDate),
    guestCount: input.guestCount,
    paymentStatus: INITIAL_PAYMENT_STATUS,
    scheduleId: input.scheduleId,
    status: INITIAL_BOOKING_STATUS,
    totalAmount,
    tourId: input.tourId,
    tourTitle: tour.title,
  };
}
