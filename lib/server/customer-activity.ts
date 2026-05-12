import "server-only";

import { executePagedQuery } from "@/lib/server/scylla";
import type {
  CustomerBookingHistoryItem,
  CustomerPaymentHistoryItem,
} from "@/lib/shared/customer-activity";

import { decimalToString, localDateToString } from "./internal-data/shared";

const DEFAULT_ACTIVITY_PAGE_SIZE = 8;
const MAX_ACTIVITY_PAGE_SIZE = 30;
const SEARCH_SCAN_MULTIPLIER = 4;

type BookingHistoryRow = {
  booked_at: unknown;
  booking_code: string;
  booking_id: string;
  currency: string;
  departure_date: string;
  payment_status: string;
  status: string;
  total_amount: unknown;
  tour_id: string;
  tour_title: string;
};

type PaymentHistoryRow = {
  amount: unknown;
  booking_id: string;
  created_at: unknown;
  currency: string;
  payment_id: string;
  provider: string;
  status: string;
};

function clampPageSize(limit?: number) {
  if (!Number.isFinite(limit) || !limit) {
    return DEFAULT_ACTIVITY_PAGE_SIZE;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_ACTIVITY_PAGE_SIZE);
}

function toBooking(row: BookingHistoryRow): CustomerBookingHistoryItem {
  return {
    bookedAt: String(row.booked_at),
    bookingCode: row.booking_code,
    bookingId: String(row.booking_id),
    currency: row.currency,
    departureDate: localDateToString(row.departure_date),
    paymentStatus: row.payment_status,
    status: row.status,
    totalAmount: decimalToString(row.total_amount),
    tourId: String(row.tour_id),
    tourTitle: row.tour_title,
  };
}

function toPayment(row: PaymentHistoryRow): CustomerPaymentHistoryItem {
  return {
    amount: decimalToString(row.amount),
    bookingId: String(row.booking_id),
    createdAt: String(row.created_at),
    currency: row.currency,
    paymentId: String(row.payment_id),
    provider: row.provider,
    status: row.status,
  };
}

function matchesQuery(values: Array<string | null | undefined>, query?: string | null) {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return values.filter(Boolean).join(" ").toLowerCase().includes(normalizedQuery);
}

export async function listCustomerBookingsPage(
  userId: string,
  options?: {
    cursor?: string | null;
    limit?: number;
    query?: string | null;
  },
) {
  const limit = clampPageSize(options?.limit);
  const query = options?.query?.trim() ?? "";
  const fetchSize = query ? Math.min(limit * SEARCH_SCAN_MULTIPLIER, MAX_ACTIVITY_PAGE_SIZE * SEARCH_SCAN_MULTIPLIER) : limit;
  const bookings: CustomerBookingHistoryItem[] = [];
  let pageState: string | Buffer | null | undefined = options?.cursor ?? undefined;

  do {
    const page: { pageState: string | Buffer | null; rows: BookingHistoryRow[] } = await executePagedQuery<BookingHistoryRow>(
      `SELECT booked_at, booking_id, booking_code, tour_id, tour_title, status, payment_status,
              total_amount, currency, departure_date
       FROM bookings_by_user
       WHERE user_id = ?`,
      [userId],
      { fetchSize, pageState },
    );

    pageState = page.pageState;
    bookings.push(
      ...page.rows
        .map(toBooking)
        .filter((booking) =>
          matchesQuery(
            [
              booking.bookingCode,
              booking.tourTitle,
              booking.status,
              booking.paymentStatus,
              booking.departureDate,
            ],
            query,
          ),
        ),
    );
  } while (bookings.length < limit && pageState);

  return {
    bookings: bookings.slice(0, limit),
    nextCursor: pageState ? String(pageState) : null,
  };
}

export async function listCustomerPaymentsPage(
  userId: string,
  options?: {
    cursor?: string | null;
    limit?: number;
    query?: string | null;
  },
) {
  const limit = clampPageSize(options?.limit);
  const query = options?.query?.trim() ?? "";
  const fetchSize = query ? Math.min(limit * SEARCH_SCAN_MULTIPLIER, MAX_ACTIVITY_PAGE_SIZE * SEARCH_SCAN_MULTIPLIER) : limit;
  const payments: CustomerPaymentHistoryItem[] = [];
  let pageState: string | Buffer | null | undefined = options?.cursor ?? undefined;

  do {
    const page: { pageState: string | Buffer | null; rows: PaymentHistoryRow[] } = await executePagedQuery<PaymentHistoryRow>(
      `SELECT created_at, payment_id, booking_id, amount, currency, provider, status
       FROM payments_by_user
       WHERE user_id = ?`,
      [userId],
      { fetchSize, pageState },
    );

    pageState = page.pageState;
    payments.push(
      ...page.rows
        .map(toPayment)
        .filter((payment) =>
          matchesQuery(
            [
              payment.paymentId,
              payment.bookingId,
              payment.provider,
              payment.status,
              payment.currency,
            ],
            query,
          ),
        ),
    );
  } while (payments.length < limit && pageState);

  return {
    nextCursor: pageState ? String(pageState) : null,
    payments: payments.slice(0, limit),
  };
}
