import type {
  PublicTourCountriesResponse,
  PublicTourDetail,
  PublicTourFeed,
  PublicTourListResponse,
  PublicTourReviewListResponse,
  TourReviewMutationRequest,
} from "@/lib/shared/public-tours";

import { apiClient } from "./core";

export async function getPublicToursPage(input: {
  countryKey?: string | null;
  cursor?: string | null;
  feed: PublicTourFeed;
  limit?: number;
}) {
  const response = await apiClient.get<PublicTourListResponse>("/tours", {
    params: {
      cursor: input.cursor ?? undefined,
      country: input.countryKey ?? undefined,
      feed: input.feed,
      limit: input.limit,
    },
  });

  return response.data;
}

export async function getPublicTourCountries(feed: PublicTourFeed) {
  const response = await apiClient.get<PublicTourCountriesResponse>("/tours/countries", {
    params: { feed },
  });

  return response.data;
}

export async function getPublicTour(slugOrId: string) {
  const response = await apiClient.get<{ tour: PublicTourDetail }>(`/tours/${slugOrId}`);

  return response.data;
}

export async function getPublicTourReviews(input: {
  cursor?: string | null;
  limit?: number;
  slugOrId: string;
}) {
  const response = await apiClient.get<PublicTourReviewListResponse>(
    `/tours/${input.slugOrId}/reviews`,
    {
      params: {
        cursor: input.cursor ?? undefined,
        limit: input.limit,
      },
    },
  );

  return response.data;
}

export async function createPublicTourReview(slugOrId: string, input: TourReviewMutationRequest) {
  const response = await apiClient.post(`/tours/${slugOrId}/reviews`, input);

  return response.data;
}
