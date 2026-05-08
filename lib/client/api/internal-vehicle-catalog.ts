import type { InternalVehicleCatalogItem, InternalVehicleCatalogMedia, VehicleCatalogMutationRequest } from "@/lib/shared/internal";

import { apiClient } from "./core";
export async function getInternalVehicleCatalog(status?: string) {
  const response = await apiClient.get<{ catalog: InternalVehicleCatalogItem[] }>("/internal/vehicle-catalog", {
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function getInternalVehicleCatalogPage(input: {
  cursor?: string | null;
  limit?: number;
  q?: string;
  status?: string;
}) {
  const response = await apiClient.get<{ catalog: InternalVehicleCatalogItem[]; nextCursor: string | null }>("/internal/vehicle-catalog", {
    params: {
      cursor: input.cursor ?? undefined,
      limit: input.limit,
      q: input.q?.trim() || undefined,
      status: input.status,
    },
  });

  return response.data;
}

export async function getInternalVehicleCatalogItem(vehicleCatalogId: string) {
  const response = await apiClient.get<{ catalogItem: InternalVehicleCatalogItem }>(`/internal/vehicle-catalog/${vehicleCatalogId}`);

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

export async function archiveInternalVehicleCatalog(vehicleCatalogId: string) {
  const response = await apiClient.delete<{ catalogItem: InternalVehicleCatalogItem }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}`,
  );

  return response.data;
}

export const deleteInternalVehicleCatalog = archiveInternalVehicleCatalog;

export async function hardDeleteInternalVehicleCatalog(vehicleCatalogId: string) {
  const response = await apiClient.delete<{ catalogItem: InternalVehicleCatalogItem; message: string }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}`,
    {
      params: { mode: "hard" },
    },
  );

  return response.data;
}

export async function restoreInternalVehicleCatalog(vehicleCatalogId: string) {
  const response = await apiClient.patch<{ catalogItem: InternalVehicleCatalogItem }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}/restore`,
  );

  return response.data;
}

export async function getInternalVehicleCatalogMedia(vehicleCatalogId: string) {
  const response = await apiClient.get<{ media: InternalVehicleCatalogMedia[] }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}/media`,
  );

  return response.data;
}

export async function uploadInternalVehicleCatalogMedia(
  vehicleCatalogId: string,
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

  const response = await apiClient.post<{ media: InternalVehicleCatalogMedia[] }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}/media`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return response.data;
}

export async function deleteInternalVehicleCatalogMedia(vehicleCatalogId: string, mediaId: string) {
  const response = await apiClient.delete<{ media: InternalVehicleCatalogMedia }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}/media/${mediaId}`,
  );

  return response.data;
}

export async function setInternalVehicleCatalogMediaCover(vehicleCatalogId: string, mediaId: string) {
  const response = await apiClient.patch<{ media: InternalVehicleCatalogMedia }>(
    `/internal/vehicle-catalog/${vehicleCatalogId}/media/${mediaId}/cover`,
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

