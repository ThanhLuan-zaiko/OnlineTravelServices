import "server-only";

import { types } from "cassandra-driver";

import type {
  InternalItineraryItem,
  InternalPromotion,
  InternalSchedule,
  InternalTour,
} from "@/lib/shared/internal";

export const TOUR_LIST_STATUSES = ["published", "draft", "archived"] as const;
export const PROMOTION_LIST_STATUSES = ["published", "scheduled", "draft", "expired", "archived"] as const;
export const BOOKING_STATUSES = ["confirmed", "pending", "cancelled", "completed"] as const;

export type TourByIdRow = {
  approved_by: string | null;
  average_rating: unknown;
  base_price: unknown;
  category: string;
  created_at: Date;
  created_by: string | null;
  currency: string;
  destination_id: string;
  destination_name: string;
  duration_days: number;
  duration_nights: number;
  excluded_services: string[] | null;
  included_services: string[] | null;
  max_guests: number;
  min_guests: number;
  published_at: Date | null;
  rating_count: number | null;
  slug: string;
  status: "archived" | "draft" | "published";
  summary: string | null;
  title: string;
  tour_id: string;
  tour_type: string;
  updated_at: Date;
  vip_only: boolean;
};

export type TourStatusRow = {
  tour_id: string;
};

export type ScheduleRow = {
  available_slots: number;
  booked_slots: number;
  currency: string;
  departure_date: types.LocalDate | string;
  departure_time: string;
  guide_staff_id: string | null;
  price: unknown;
  schedule_id: string;
  status: "cancelled" | "closed" | "open";
};

export type ItineraryRow = {
  day_number: number;
  description: string | null;
  end_time: string | null;
  item_order: number;
  location_name: string | null;
  service_type: string | null;
  start_time: string | null;
  title: string;
};

export type PromotionRow = {
  code: string;
  created_by: string | null;
  customer_tier: string;
  description: string | null;
  discount_type: "amount" | "percent";
  discount_value: unknown;
  end_at: Date;
  max_discount_amount: unknown | null;
  promotion_id: string;
  promotion_type: string;
  start_at: Date;
  status: "archived" | "draft" | "expired" | "published" | "scheduled";
  title: string;
  usage_limit: number;
  used_count: number | null;
};

export function decimal(value: string) {
  return types.BigDecimal.fromString(value);
}

export function decimalToString(value: unknown) {
  return value == null ? "0" : String(value);
}

export function dateToIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function localDateToString(value: types.LocalDate | string) {
  return String(value);
}

export function toTour(row: TourByIdRow): InternalTour {
  return {
    approvedBy: row.approved_by ? String(row.approved_by) : null,
    averageRating: decimalToString(row.average_rating),
    basePrice: decimalToString(row.base_price),
    category: row.category,
    createdAt: row.created_at.toISOString(),
    createdBy: row.created_by ? String(row.created_by) : null,
    currency: row.currency,
    destinationId: String(row.destination_id),
    destinationName: row.destination_name,
    durationDays: row.duration_days,
    durationNights: row.duration_nights,
    excludedServices: row.excluded_services ?? [],
    includedServices: row.included_services ?? [],
    maxGuests: row.max_guests,
    minGuests: row.min_guests,
    publishedAt: dateToIso(row.published_at),
    ratingCount: row.rating_count ?? 0,
    slug: row.slug,
    status: row.status,
    summary: row.summary,
    title: row.title,
    tourId: String(row.tour_id),
    tourType: row.tour_type,
    updatedAt: row.updated_at.toISOString(),
    vipOnly: row.vip_only,
  };
}

export function toSchedule(row: ScheduleRow): InternalSchedule {
  return {
    availableSlots: row.available_slots,
    bookedSlots: row.booked_slots,
    currency: row.currency,
    departureDate: localDateToString(row.departure_date),
    departureTime: row.departure_time,
    guideStaffId: row.guide_staff_id ? String(row.guide_staff_id) : null,
    price: decimalToString(row.price),
    scheduleId: String(row.schedule_id),
    status: row.status,
  };
}

export function toItineraryItem(row: ItineraryRow): InternalItineraryItem {
  return {
    dayNumber: row.day_number,
    description: row.description,
    endTime: row.end_time,
    itemOrder: row.item_order,
    locationName: row.location_name,
    serviceType: row.service_type,
    startTime: row.start_time,
    title: row.title,
  };
}

export function toPromotion(row: PromotionRow): InternalPromotion {
  return {
    code: row.code,
    createdBy: row.created_by ? String(row.created_by) : null,
    customerTier: row.customer_tier,
    description: row.description,
    discountType: row.discount_type,
    discountValue: decimalToString(row.discount_value),
    endAt: row.end_at.toISOString(),
    maxDiscountAmount: row.max_discount_amount ? decimalToString(row.max_discount_amount) : null,
    promotionId: String(row.promotion_id),
    promotionType: row.promotion_type,
    startAt: row.start_at.toISOString(),
    status: row.status,
    title: row.title,
    usageLimit: row.usage_limit,
    usedCount: row.used_count ?? 0,
  };
}
