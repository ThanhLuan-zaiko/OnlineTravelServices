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
  InternalAccountProfileRequest,
  InternalAccountProfileResponse,
  InternalDestination,
  InternalDestinationMedia,
  InternalItineraryItem,
  InternalLoginRequest,
  InternalPromotion,
  InternalRevenueResponse,
  InternalSchedule,
  InternalServiceProvider,
  InternalServiceCatalog,
  InternalTour,
  InternalTourMedia,
  InternalTourVehicle,
  InternalVehicleCatalogItem,
  ItineraryMutationRequest,
  DestinationMutationRequest,
  PromotionMutationRequest,
  ScheduleMutationRequest,
  ServiceProviderMutationRequest,
  ServiceCatalogMutationRequest,
  TourVehicleMutationRequest,
  TourMutationRequest,
  VehicleCatalogMutationRequest,
} from "@/lib/shared/internal";

export type ApiError = {
  fields?: string[];
  details?: string;
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
  (error: AxiosError<{ database?: { message?: string }; details?: string; fields?: string[]; message?: string }>) => {
    const normalizedError: ApiError = {
      details: error.response?.data?.details,
      fields: error.response?.data?.fields,
      message:
        error.response?.data?.database?.message ??
        error.response?.data?.details ??
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

export async function getCurrentInternalAccountProfile() {
  const response = await apiClient.get<InternalAccountProfileResponse>("/internal/account");

  return response.data;
}

export async function updateInternalAccountProfile(input: InternalAccountProfileRequest) {
  const response = await apiClient.patch<InternalAccountProfileResponse>("/internal/account", input);

  return response.data;
}

export async function getInternalTours(status?: string) {
  const response = await apiClient.get<{ tours: InternalTour[] }>("/internal/tours", {
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function getInternalDestinations(status?: string) {
  const response = await apiClient.get<{ destinations: InternalDestination[] }>("/internal/destinations", {
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function getInternalDestinationPage(input: {
  cursor?: string | null;
  limit?: number;
  q?: string;
  status?: string;
}) {
  const response = await apiClient.get<{ destinations: InternalDestination[]; nextCursor: string | null }>("/internal/destinations", {
    params: {
      cursor: input.cursor ?? undefined,
      limit: input.limit,
      q: input.q?.trim() || undefined,
      status: input.status,
    },
  });

  return response.data;
}

export async function getInternalDestination(destinationId: string) {
  const response = await apiClient.get<{ destination: InternalDestination }>(`/internal/destinations/${destinationId}`);

  return response.data;
}

export async function createInternalDestination(input: DestinationMutationRequest) {
  const response = await apiClient.post<{ destination: InternalDestination }>("/internal/destinations", input);

  return response.data;
}

export async function updateInternalDestination(destinationId: string, input: DestinationMutationRequest) {
  const response = await apiClient.patch<{ destination: InternalDestination }>(`/internal/destinations/${destinationId}`, input);

  return response.data;
}

export async function archiveInternalDestination(destinationId: string) {
  const response = await apiClient.delete<{ destination: InternalDestination }>(`/internal/destinations/${destinationId}`);

  return response.data;
}

export async function hardDeleteInternalDestination(destinationId: string) {
  const response = await apiClient.delete<{ destination: InternalDestination; message: string }>(`/internal/destinations/${destinationId}`, {
    params: { mode: "hard" },
  });

  return response.data;
}

export async function restoreInternalDestination(destinationId: string) {
  const response = await apiClient.patch<{ destination: InternalDestination }>(`/internal/destinations/${destinationId}/restore`);

  return response.data;
}

export async function getInternalDestinationMedia(destinationId: string) {
  const response = await apiClient.get<{ media: InternalDestinationMedia[] }>(`/internal/destinations/${destinationId}/media`);

  return response.data;
}

export async function uploadInternalDestinationMedia(
  destinationId: string,
  input: {
    file: File;
    isCover: boolean;
    mediaType: string;
    title?: string;
  },
) {
  const formData = new FormData();

  formData.append("file", input.file);
  formData.append("isCover", input.isCover ? "1" : "0");
  formData.append("mediaType", input.mediaType);
  if (input.title) {
    formData.append("title", input.title);
  }

  const response = await apiClient.post<{ media: InternalDestinationMedia }>(`/internal/destinations/${destinationId}/media`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function deleteInternalDestinationMedia(destinationId: string, mediaId: string) {
  const response = await apiClient.delete<{ media: InternalDestinationMedia }>(
    `/internal/destinations/${destinationId}/media/${mediaId}`,
  );

  return response.data;
}

export async function setInternalDestinationMediaCover(destinationId: string, mediaId: string) {
  const response = await apiClient.patch<{ media: InternalDestinationMedia }>(
    `/internal/destinations/${destinationId}/media/${mediaId}/cover`,
  );

  return response.data;
}

export async function getInternalServices(destinationId: string) {
  const response = await apiClient.get<{ services: InternalServiceCatalog[] }>("/internal/services", {
    params: { destinationId },
  });

  return response.data;
}

export async function createInternalService(input: ServiceCatalogMutationRequest) {
  const response = await apiClient.post<{ service: InternalServiceCatalog }>("/internal/services", input);

  return response.data;
}

export async function updateInternalService(
  destinationId: string,
  serviceType: string,
  serviceId: string,
  input: ServiceCatalogMutationRequest,
) {
  const response = await apiClient.patch<{ service: InternalServiceCatalog }>(
    `/internal/services/${destinationId}/${serviceType}/${serviceId}`,
    input,
  );

  return response.data;
}

export async function deleteInternalService(destinationId: string, serviceType: string, serviceId: string) {
  const response = await apiClient.delete<{ service: InternalServiceCatalog }>(
    `/internal/services/${destinationId}/${serviceType}/${serviceId}`,
  );

  return response.data;
}

export async function getInternalServiceProviders(serviceType: string) {
  const response = await apiClient.get<{ providers: InternalServiceProvider[] }>("/internal/service-providers", {
    params: { serviceType },
  });

  return response.data;
}

export async function createInternalServiceProvider(input: ServiceProviderMutationRequest) {
  const response = await apiClient.post<{ provider: InternalServiceProvider }>("/internal/service-providers", input);

  return response.data;
}

export async function updateInternalServiceProvider(serviceType: string, providerId: string, input: ServiceProviderMutationRequest) {
  const response = await apiClient.patch<{ provider: InternalServiceProvider }>(
    `/internal/service-providers/${serviceType}/${providerId}`,
    input,
  );

  return response.data;
}

export async function deleteInternalServiceProvider(serviceType: string, providerId: string) {
  const response = await apiClient.delete<{ provider: InternalServiceProvider }>(
    `/internal/service-providers/${serviceType}/${providerId}`,
  );

  return response.data;
}

export async function getInternalVehicleCatalog(status?: string) {
  const response = await apiClient.get<{ catalog: InternalVehicleCatalogItem[] }>("/internal/vehicle-catalog", {
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function createInternalVehicleCatalog(input: VehicleCatalogMutationRequest) {
  const response = await apiClient.post<{ catalogItem: InternalVehicleCatalogItem }>("/internal/vehicle-catalog", input);

  return response.data;
}

export async function updateInternalVehicleCatalog(vehicleCatalogId: string, input: VehicleCatalogMutationRequest) {
  const response = await apiClient.patch<{ catalogItem: InternalVehicleCatalogItem }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}`,
    input,
  );

  return response.data;
}

export async function deleteInternalVehicleCatalog(vehicleCatalogId: string) {
  const response = await apiClient.delete<{ catalogItem: InternalVehicleCatalogItem }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}`,
  );

  return response.data;
}

export async function uploadInternalVehicleCatalogImage(vehicleCatalogId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiClient.post<{ catalogItem: InternalVehicleCatalogItem }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}/image`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function deleteInternalVehicleCatalogImage(vehicleCatalogId: string) {
  const response = await apiClient.delete<{ catalogItem: InternalVehicleCatalogItem }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}/image`,
  );

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

export async function getInternalTourMedia(tourId: string) {
  const response = await apiClient.get<{ media: InternalTourMedia[] }>(`/internal/tours/${tourId}/media`);

  return response.data;
}

export async function uploadInternalTourMedia(
  tourId: string,
  input: {
    file: File;
    isCover: boolean;
    mediaType: string;
    title?: string;
  },
) {
  const formData = new FormData();

  formData.append("file", input.file);
  formData.append("isCover", input.isCover ? "1" : "0");
  formData.append("mediaType", input.mediaType);
  if (input.title) {
    formData.append("title", input.title);
  }

  const response = await apiClient.post<{ media: InternalTourMedia }>(`/internal/tours/${tourId}/media`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function deleteInternalTourMedia(tourId: string, mediaId: string) {
  const response = await apiClient.delete<{ media: InternalTourMedia }>(`/internal/tours/${tourId}/media/${mediaId}`);

  return response.data;
}

export async function setInternalTourMediaCover(tourId: string, mediaId: string) {
  const response = await apiClient.patch<{ media: InternalTourMedia }>(`/internal/tours/${tourId}/media/${mediaId}/cover`);

  return response.data;
}

export async function getInternalTourVehicles(tourId: string) {
  const response = await apiClient.get<{ vehicles: InternalTourVehicle[] }>(`/internal/tours/${tourId}/vehicles`);

  return response.data;
}

export async function createInternalTourVehicle(tourId: string, input: TourVehicleMutationRequest) {
  const response = await apiClient.post<{ vehicle: InternalTourVehicle }>(`/internal/tours/${tourId}/vehicles`, input);

  return response.data;
}

export async function updateInternalTourVehicle(tourId: string, vehicleId: string, input: TourVehicleMutationRequest) {
  const response = await apiClient.patch<{ vehicle: InternalTourVehicle }>(`/internal/tours/${tourId}/vehicles/${vehicleId}`, input);

  return response.data;
}

export async function deleteInternalTourVehicle(tourId: string, vehicleId: string) {
  const response = await apiClient.delete<{ vehicle: InternalTourVehicle }>(`/internal/tours/${tourId}/vehicles/${vehicleId}`);

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
