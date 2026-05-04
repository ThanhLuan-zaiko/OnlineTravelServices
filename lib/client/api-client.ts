import axios, { AxiosError } from "axios";

import type {
  AccountProfileRequest,
  AccountProfileResponse,
  AuthMessageResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "@/lib/shared/auth";
import type { HealthResponse } from "@/lib/shared/health";
import type {
  InternalItineraryItem,
  InternalLoginRequest,
  InternalPromotion,
  InternalRevenueResponse,
  InternalSchedule,
  InternalTour,
  ItineraryMutationRequest,
  PromotionMutationRequest,
  ScheduleMutationRequest,
  TourMutationRequest,
} from "@/lib/shared/internal";

export type ApiError = {
  fields?: string[];
  message: string;
  status?: number;
};

export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ database?: { message?: string }; fields?: string[]; message?: string }>) => {
    const normalizedError: ApiError = {
      fields: error.response?.data?.fields,
      message:
        error.response?.data?.database?.message ??
        error.response?.data?.message ??
        error.message ??
        "Request failed.",
      status: error.response?.status,
    };

    return Promise.reject(normalizedError);
  },
);

export async function getHealth() {
  const response = await apiClient.get<HealthResponse>("/health");

  return response.data;
}

export async function registerCustomerAccount(input: RegisterRequest) {
  const response = await apiClient.post<AuthResponse>("/auth/register", input);

  return response.data;
}

export async function loginAccount(input: LoginRequest) {
  const response = await apiClient.post<AuthResponse>("/auth/login", input);

  return response.data;
}

export async function loginCustomerAccount(input: LoginRequest) {
  return loginAccount(input);
}

export async function logoutCustomerAccount() {
  const response = await apiClient.post<AuthMessageResponse>("/auth/logout");

  return response.data;
}

export async function getCurrentCustomerAccount() {
  const response = await apiClient.get<AuthResponse>("/auth/me");

  return response.data;
}

export async function getAccountProfile() {
  const response = await apiClient.get<AccountProfileResponse>("/account");

  return response.data;
}

export async function updateAccountProfile(input: AccountProfileRequest) {
  const response = await apiClient.patch<AccountProfileResponse>("/account", input);

  return response.data;
}

export async function loginInternalAccount(input: InternalLoginRequest) {
  const response = await apiClient.post<AuthResponse>("/internal/auth/login", input);

  return response.data;
}

export async function logoutInternalAccount() {
  const response = await apiClient.post<AuthMessageResponse>("/internal/auth/logout");

  return response.data;
}

export async function getCurrentInternalAccount() {
  const response = await apiClient.get<AuthResponse>("/internal/auth/me");

  return response.data;
}

export async function getInternalTours(status?: string) {
  const response = await apiClient.get<{ tours: InternalTour[] }>("/internal/tours", {
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function createInternalTour(input: TourMutationRequest) {
  const response = await apiClient.post<{ tour: InternalTour }>("/internal/tours", input);

  return response.data;
}

export async function getInternalTour(tourId: string) {
  const response = await apiClient.get<{ tour: InternalTour }>(`/internal/tours/${tourId}`);

  return response.data;
}

export async function updateInternalTour(tourId: string, input: TourMutationRequest) {
  const response = await apiClient.patch<{ tour: InternalTour }>(`/internal/tours/${tourId}`, input);

  return response.data;
}

export async function archiveInternalTour(tourId: string) {
  const response = await apiClient.delete<{ tour: InternalTour }>(`/internal/tours/${tourId}`);

  return response.data;
}

export async function getInternalSchedules(tourId: string) {
  const response = await apiClient.get<{ schedules: InternalSchedule[] }>(`/internal/tours/${tourId}/schedules`);

  return response.data;
}

export async function createInternalSchedule(tourId: string, input: ScheduleMutationRequest) {
  const response = await apiClient.post<{ schedule: InternalSchedule }>(`/internal/tours/${tourId}/schedules`, input);

  return response.data;
}

export async function updateInternalSchedule(tourId: string, scheduleId: string, input: ScheduleMutationRequest) {
  const response = await apiClient.patch<{ schedule: InternalSchedule }>(
    `/internal/tours/${tourId}/schedules/${scheduleId}`,
    input,
  );

  return response.data;
}

export async function deleteInternalSchedule(tourId: string, schedule: InternalSchedule) {
  const response = await apiClient.delete<AuthMessageResponse>(
    `/internal/tours/${tourId}/schedules/${schedule.scheduleId}`,
    {
      params: {
        departureDate: schedule.departureDate,
      },
    },
  );

  return response.data;
}

export async function getInternalItinerary(tourId: string) {
  const response = await apiClient.get<{ items: InternalItineraryItem[] }>(`/internal/tours/${tourId}/itinerary`);

  return response.data;
}

export async function upsertInternalItineraryItem(tourId: string, input: ItineraryMutationRequest) {
  const response = await apiClient.post<{ item: InternalItineraryItem }>(`/internal/tours/${tourId}/itinerary`, input);

  return response.data;
}

export async function deleteInternalItineraryItem(tourId: string, item: InternalItineraryItem) {
  const response = await apiClient.delete<AuthMessageResponse>(
    `/internal/tours/${tourId}/itinerary/${item.dayNumber}/${item.itemOrder}`,
  );

  return response.data;
}

export async function getInternalPromotions(status?: string) {
  const response = await apiClient.get<{ promotions: InternalPromotion[] }>("/internal/promotions", {
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function createInternalPromotion(input: PromotionMutationRequest) {
  const response = await apiClient.post<{ promotion: InternalPromotion }>("/internal/promotions", input);

  return response.data;
}

export async function updateInternalPromotion(promotionId: string, input: PromotionMutationRequest) {
  const response = await apiClient.patch<{ promotion: InternalPromotion }>(
    `/internal/promotions/${promotionId}`,
    input,
  );

  return response.data;
}

export async function archiveInternalPromotion(promotionId: string) {
  const response = await apiClient.delete<{ promotion: InternalPromotion }>(`/internal/promotions/${promotionId}`);

  return response.data;
}

export async function getInternalRevenue(input?: { day?: string; month?: string }) {
  const response = await apiClient.get<{ revenue: InternalRevenueResponse }>("/internal/revenue", {
    params: input,
  });

  return response.data;
}
