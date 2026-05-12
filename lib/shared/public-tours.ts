import { z } from "zod";

export const publicTourFeedSchema = z.enum(["all", "domestic", "international"]);

export type PublicTourFeed = z.infer<typeof publicTourFeedSchema>;

export const tourReviewMutationSchema = z.object({
  comment: z.string().trim().min(3, "Vui lòng nhập nhận xét.").max(1200, "Nhận xét quá dài."),
  rating: z.coerce.number().int().min(1, "Vui lòng chọn số sao.").max(5, "Số sao không hợp lệ."),
});

export type PublicTourScheduleSummary = {
  availableSlots: number;
  bookedSlots: number;
  currency: string;
  departureDate: string;
  departureTime: string;
  price: string;
  scheduleId: string;
  status: "cancelled" | "closed" | "open";
};

export type PublicTourItineraryItem = {
  dayNumber: number;
  description: string | null;
  endTime: string | null;
  itemOrder: number;
  locationName: string | null;
  serviceType: string | null;
  startTime: string | null;
  title: string;
};

export type PublicTourMediaItem = {
  mediaId: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  title: string | null;
};

export type PublicTourCountry = {
  country: string;
  countryKey: string;
};

export type PublicTourReview = {
  comment: string;
  fullName: string;
  isVipReview: boolean;
  rating: number;
  reviewId: string;
  reviewTime: string;
  status: string;
  tourId: string;
  userId: string;
};

export type PublicTourListItem = {
  averageRating: string;
  basePrice: string;
  category: string;
  city: string;
  country: string;
  coverImageUrl: string | null;
  currency: string;
  destinationAddress: string | null;
  destinationId: string;
  destinationName: string;
  durationDays: number;
  durationNights: number;
  latitude: number;
  longitude: number;
  maxGuests: number;
  minGuests: number;
  nextDeparture: {
    availableSlots: number;
    currency: string;
    date: string;
    price: string;
    time: string;
  } | null;
  publishedAt: string;
  ratingCount: number;
  region: string;
  slug: string;
  summary: string | null;
  title: string;
  tourId: string;
  tourType: string;
  updatedAt: string;
  vipOnly: boolean;
};

export type PublicTourDetail = PublicTourListItem & {
  excludedServices: string[];
  gallery: PublicTourMediaItem[];
  includedServices: string[];
  itinerary: PublicTourItineraryItem[];
  schedules: PublicTourScheduleSummary[];
};

export type PublicTourListResponse = {
  nextCursor: string | null;
  tours: PublicTourListItem[];
};

export type PublicTourCountriesResponse = {
  countries: PublicTourCountry[];
};

export type PublicTourReviewListResponse = {
  nextCursor: string | null;
  reviews: PublicTourReview[];
};

export type TourReviewMutationRequest = z.infer<typeof tourReviewMutationSchema>;

export type PublicTourEvent =
  | {
      feeds: PublicTourFeed[];
      tour: PublicTourListItem;
      type: "tour:published" | "tour:updated";
    }
  | {
      feeds: PublicTourFeed[];
      tourId: string;
      type: "tour:removed";
    };
