import "server-only";

import { types } from "cassandra-driver";

import type {
  InternalDestination,
  InternalDestinationMedia,
  InternalItineraryItem,
  InternalPromotion,
  InternalSchedule,
  InternalServiceCatalog,
  InternalServiceProvider,
  InternalTour,
  InternalTourMedia,
  InternalTourVehicle,
  InternalVehicleCatalogItem,
  InternalVehicleCatalogMedia,
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
  cover_image_url: string | null;
  vehicle_catalog_label: string | null;
  vehicle_catalog_id: string | null;
  vehicle_capacity: number | null;
  vehicle_model: string | null;
  vehicle_type: string | null;
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

export type DestinationByIdRow = {
  address: string | null;
  average_rating: unknown;
  category: string;
  city: string;
  country: string;
  created_at: Date;
  description: string | null;
  destination_id: string;
  latitude: unknown | null;
  longitude: unknown | null;
  name: string;
  popularity_score: number;
  region: string;
  safety_level: string;
  search_keywords: string[] | null;
  status: "archived" | "draft" | "published";
  updated_at: Date;
  cover_image_url: string | null;
};

export type DestinationStatusRow = {
  address: string | null;
  city: string;
  country: string;
  destination_id: string;
  name: string;
  region: string;
  status: "archived" | "draft" | "published";
  updated_at: Date | types.TimeUuid | string;
};

export type DestinationMediaRow = {
  destination_id: string;
  media_id: string;
  media_order: number;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  title: string | null;
  uploaded_at: Date;
  uploaded_by: string | null;
};

export type ServiceCatalogRow = {
  base_price: unknown;
  currency: string;
  destination_id: string;
  description: string | null;
  name: string;
  provider_id: string | null;
  service_id: string;
  service_type: string;
  status: "archived" | "draft" | "published";
  updated_at: Date;
};

export type ServiceProviderRow = {
  contract_status: "active" | "draft" | "expired";
  email: string;
  phone: string;
  provider_id: string;
  provider_name: string;
  rating: unknown;
  region: string;
  service_type: string;
  status: "active" | "inactive" | "suspended";
  updated_at: Date;
};

export type VehicleCatalogRow = {
  archived_at: Date | null;
  archived_from_status: "active" | "inactive" | null;
  catalog_bucket: string;
  image_url: string | null;
  label: string;
  status: "active" | "inactive" | "archived";
  updated_at: Date;
  thumbnail_url: string | null;
  vehicle_capacity: number;
  vehicle_catalog_id: string;
  vehicle_model: string;
  vehicle_type: string;
};

export type VehicleCatalogMediaRow = {
  is_cover: boolean | null;
  media_id: string;
  media_order: number;
  media_url: string;
  thumbnail_url: string;
  title: string | null;
  uploaded_at: Date;
  uploaded_by: string | null;
  vehicle_catalog_id: string;
};

export type TourMediaRow = {
  media_id: string;
  media_order: number;
  media_type: string;
  media_url: string;
  thumbnail_url: string;
  title: string | null;
  uploaded_at: Date;
  uploaded_by: string | null;
};

export type TourVehicleRow = {
  capacity: number;
  driver_name: string;
  driver_phone: string;
  model: string;
  notes: string | null;
  plate_number: string;
  status: "active" | "inactive" | "maintenance";
  tour_id: string;
  updated_at: Date;
  vehicle_id: string;
  vehicle_type: string;
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

export function decimalFromNumber(value: number) {
  return types.BigDecimal.fromString(Number.isFinite(value) ? value.toString() : "0");
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
    coverImageUrl: row.cover_image_url,
    vehicleCatalogLabel: row.vehicle_catalog_label ?? "",
    vehicleCatalogId: row.vehicle_catalog_id ?? "",
    vehicleCapacity: row.vehicle_capacity ?? 0,
    vehicleModel: row.vehicle_model ?? "",
    vehicleType: row.vehicle_type ?? "",
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

export function toDestination(row: DestinationByIdRow, mediaCount = 0): InternalDestination {
  return {
    address: row.address,
    averageRating: decimalToString(row.average_rating),
    category: row.category,
    city: row.city,
    country: row.country,
    createdAt: row.created_at.toISOString(),
    coverImageUrl: row.cover_image_url,
    destinationId: String(row.destination_id),
    description: row.description,
    latitude: row.latitude == null ? 0 : Number(row.latitude),
    longitude: row.longitude == null ? 0 : Number(row.longitude),
    mediaCount,
    name: row.name,
    popularityScore: row.popularity_score,
    region: row.region,
    safetyLevel: row.safety_level,
    searchKeywords: row.search_keywords ?? [],
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toDestinationMedia(row: DestinationMediaRow): InternalDestinationMedia {
  return {
    destinationId: String(row.destination_id),
    mediaId: String(row.media_id),
    mediaOrder: row.media_order,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url,
    title: row.title,
    uploadedAt: row.uploaded_at.toISOString(),
    uploadedBy: row.uploaded_by ? String(row.uploaded_by) : null,
  };
}

export function toServiceCatalog(row: ServiceCatalogRow): InternalServiceCatalog {
  return {
    basePrice: decimalToString(row.base_price),
    currency: row.currency,
    destinationId: String(row.destination_id),
    description: row.description,
    name: row.name,
    providerId: row.provider_id ? String(row.provider_id) : null,
    serviceId: String(row.service_id),
    serviceType: row.service_type,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toServiceProvider(row: ServiceProviderRow): InternalServiceProvider {
  return {
    contractStatus: row.contract_status,
    email: row.email,
    phone: row.phone,
    providerId: String(row.provider_id),
    providerName: row.provider_name,
    rating: Number(row.rating),
    region: row.region,
    serviceType: row.service_type,
    status: row.status,
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toVehicleCatalogItem(row: VehicleCatalogRow): InternalVehicleCatalogItem {
  return {
    archivedAt: dateToIso(row.archived_at),
    archivedFromStatus: row.archived_from_status,
    label: row.label,
    imageUrl: row.image_url,
    status: row.status,
    thumbnailUrl: row.thumbnail_url,
    updatedAt: row.updated_at.toISOString(),
    vehicleCapacity: row.vehicle_capacity,
    vehicleCatalogId: String(row.vehicle_catalog_id),
    vehicleModel: row.vehicle_model,
    vehicleType: row.vehicle_type,
  };
}

export function toVehicleCatalogMedia(row: VehicleCatalogMediaRow): InternalVehicleCatalogMedia {
  return {
    isCover: Boolean(row.is_cover),
    mediaId: String(row.media_id),
    mediaOrder: row.media_order,
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url,
    title: row.title,
    uploadedAt: row.uploaded_at.toISOString(),
    uploadedBy: row.uploaded_by ? String(row.uploaded_by) : null,
    vehicleCatalogId: String(row.vehicle_catalog_id),
  };
}

export function toTourMedia(row: TourMediaRow): InternalTourMedia {
  return {
    mediaId: String(row.media_id),
    mediaOrder: row.media_order,
    mediaType: row.media_type,
    mediaUrl: row.media_url,
    thumbnailUrl: row.thumbnail_url,
    title: row.title,
    uploadedAt: row.uploaded_at.toISOString(),
    uploadedBy: row.uploaded_by ? String(row.uploaded_by) : null,
  };
}

export function toTourVehicle(row: TourVehicleRow): InternalTourVehicle {
  return {
    capacity: row.capacity,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    model: row.model,
    notes: row.notes,
    plateNumber: row.plate_number,
    status: row.status,
    tourId: String(row.tour_id),
    updatedAt: row.updated_at.toISOString(),
    vehicleId: String(row.vehicle_id),
    vehicleType: row.vehicle_type,
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
