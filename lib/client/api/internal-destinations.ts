import type { DestinationMutationRequest, InternalDestination, InternalDestinationMedia } from "@/lib/shared/internal";

import { apiClient } from "./core";
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

