import type { AuthMessageResponse } from "@/lib/shared/auth";
import type {
  InternalItineraryItem,
  InternalSchedule,
  InternalTour,
  InternalTourMedia,
  InternalTourVehicle,
  ItineraryMutationRequest,
  ScheduleMutationRequest,
  TourMutationRequest,
  TourVehicleMutationRequest,
} from "@/lib/shared/internal";

import { apiClient } from "./core";
export async function getInternalTours(status?: string) {
  const response = await apiClient.get<{ tours: InternalTour[] }>("/internal/tours", {
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function getInternalTourPage(input: {
  cursor?: string | null;
  limit?: number;
  q?: string;
  status?: string;
}) {
  const response = await apiClient.get<{ nextCursor: string | null; tours: InternalTour[] }>("/internal/tours", {
    params: {
      cursor: input.cursor ?? undefined,
      limit: input.limit,
      q: input.q?.trim() || undefined,
      status: input.status,
    },
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

export async function hardDeleteInternalTour(tourId: string) {
  const response = await apiClient.delete<{ message: string; tour: InternalTour }>(`/internal/tours/${tourId}`, {
    params: { mode: "hard" },
  });

  return response.data;
}

export async function restoreInternalTour(tourId: string) {
  const response = await apiClient.patch<{ tour: InternalTour }>(`/internal/tours/${tourId}/restore`);

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

