import type { InternalServiceProvider, InternalServiceProviderMedia, ServiceProviderMutationRequest } from "@/lib/shared/internal";

import { apiClient } from "./core";
export async function getInternalServiceProviders(serviceType: string, status?: string) {
  const response = await apiClient.get<{ providers: InternalServiceProvider[] }>("/internal/service-providers", {
    params: { serviceType, status },
  });

  return response.data;
}

export async function getInternalServiceProviderPage(input: {
  cursor?: string | null;
  limit?: number;
  q?: string;
  serviceType: string;
  status: string;
}) {
  const response = await apiClient.get<{ nextCursor: string | null; providers: InternalServiceProvider[] }>("/internal/service-providers", {
    params: {
      cursor: input.cursor ?? undefined,
      limit: input.limit,
      q: input.q?.trim() || undefined,
      serviceType: input.serviceType,
      status: input.status,
    },
  });

  return response.data;
}

export async function getInternalServiceProvider(serviceType: string, providerId: string) {
  const response = await apiClient.get<{ provider: InternalServiceProvider }>(`/internal/service-providers/${serviceType}/${providerId}`);

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

export async function hardDeleteInternalServiceProvider(serviceType: string, providerId: string) {
  const response = await apiClient.delete<{ message: string; provider: InternalServiceProvider }>(
    `/internal/service-providers/${serviceType}/${providerId}`,
    {
      params: { mode: "hard" },
    },
  );

  return response.data;
}

export async function restoreInternalServiceProvider(serviceType: string, providerId: string) {
  const response = await apiClient.patch<{ provider: InternalServiceProvider }>(
    `/internal/service-providers/${serviceType}/${providerId}/restore`,
  );

  return response.data;
}

export async function getInternalServiceProviderMedia(serviceType: string, providerId: string) {
  const response = await apiClient.get<{ media: InternalServiceProviderMedia[] }>(
    `/internal/service-providers/${serviceType}/${providerId}/media`,
  );

  return response.data;
}

export async function uploadInternalServiceProviderMedia(
  serviceType: string,
  providerId: string,
  input: {
    files: File[];
    isCover?: boolean;
    title?: string;
  },
) {
  const formData = new FormData();

  for (const file of input.files) {
    formData.append("files", file);
  }

  formData.append("isCover", input.isCover ? "1" : "0");
  if (input.title) {
    formData.append("title", input.title);
  }

  const response = await apiClient.post<{ media: InternalServiceProviderMedia[] }>(
    `/internal/service-providers/${serviceType}/${providerId}/media`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function deleteInternalServiceProviderMedia(serviceType: string, providerId: string, mediaId: string) {
  const response = await apiClient.delete<{ media: InternalServiceProviderMedia }>(
    `/internal/service-providers/${serviceType}/${providerId}/media/${mediaId}`,
  );

  return response.data;
}

export async function setInternalServiceProviderMediaCover(serviceType: string, providerId: string, mediaId: string) {
  const response = await apiClient.patch<{ media: InternalServiceProviderMedia }>(
    `/internal/service-providers/${serviceType}/${providerId}/media/${mediaId}/cover`,
  );

  return response.data;
}

