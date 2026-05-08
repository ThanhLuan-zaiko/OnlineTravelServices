import type { InternalServiceCatalog, InternalServiceMedia, ServiceCatalogMutationRequest } from "@/lib/shared/internal";

import { apiClient } from "./core";
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

export async function getInternalServicePage(input: {
  cursor?: string | null;
  destinationId: string;
  limit?: number;
  q?: string;
  status: string;
}) {
  const response = await apiClient.get<{ nextCursor: string | null; services: InternalServiceCatalog[] }>("/internal/services", {
    params: {
      cursor: input.cursor ?? undefined,
      destinationId: input.destinationId,
      limit: input.limit,
      q: input.q?.trim() || undefined,
      status: input.status,
    },
  });

  return response.data;
}

export async function getInternalService(destinationId: string, serviceType: string, serviceId: string) {
  const response = await apiClient.get<{ service: InternalServiceCatalog }>(
    `/internal/services/${destinationId}/${serviceType}/${serviceId}`,
  );

  return response.data;
}

export async function hardDeleteInternalService(destinationId: string, serviceType: string, serviceId: string) {
  const response = await apiClient.delete<{ message: string; service: InternalServiceCatalog }>(
    `/internal/services/${destinationId}/${serviceType}/${serviceId}`,
    {
      params: { mode: "hard" },
    },
  );

  return response.data;
}

export async function restoreInternalService(destinationId: string, serviceType: string, serviceId: string) {
  const response = await apiClient.patch<{ service: InternalServiceCatalog }>(
    `/internal/services/${destinationId}/${serviceType}/${serviceId}/restore`,
  );

  return response.data;
}

export async function getInternalServiceMedia(destinationId: string, serviceType: string, serviceId: string) {
  const response = await apiClient.get<{ media: InternalServiceMedia[] }>(
    `/internal/services/${destinationId}/${serviceType}/${serviceId}/media`,
  );

  return response.data;
}

export async function uploadInternalServiceMedia(
  destinationId: string,
  serviceType: string,
  serviceId: string,
  input: { files: File[]; isCover?: boolean; title?: string },
) {
  const formData = new FormData();

  for (const file of input.files) {
    formData.append("files", file);
  }

  formData.append("isCover", input.isCover ? "1" : "0");
  if (input.title) {
    formData.append("title", input.title);
  }

  const response = await apiClient.post<{ media: InternalServiceMedia[] }>(
    `/internal/services/${destinationId}/${serviceType}/${serviceId}/media`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function deleteInternalServiceMedia(destinationId: string, serviceType: string, serviceId: string, mediaId: string) {
  const response = await apiClient.delete<{ media: InternalServiceMedia }>(
    `/internal/services/${destinationId}/${serviceType}/${serviceId}/media/${mediaId}`,
  );

  return response.data;
}

export async function setInternalServiceMediaCover(destinationId: string, serviceType: string, serviceId: string, mediaId: string) {
  const response = await apiClient.patch<{ media: InternalServiceMedia }>(
    `/internal/services/${destinationId}/${serviceType}/${serviceId}/media/${mediaId}/cover`,
  );

  return response.data;
}

