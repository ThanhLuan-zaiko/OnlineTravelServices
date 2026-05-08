import type { InternalPromotion, InternalPromotionMedia, PromotionMutationRequest } from "@/lib/shared/internal";

import { apiClient } from "./core";
export async function getInternalPromotions(status?: string) {
  const response = await apiClient.get<{ promotions: InternalPromotion[] }>("/internal/promotions", {
    params: status ? { status } : undefined,
  });

  return response.data;
}

export async function getInternalPromotionPage(input: {
  cursor?: string | null;
  limit?: number;
  q?: string;
  status?: string;
}) {
  const response = await apiClient.get<{ nextCursor: string | null; promotions: InternalPromotion[] }>("/internal/promotions", {
    params: {
      cursor: input.cursor ?? undefined,
      limit: input.limit,
      q: input.q?.trim() || undefined,
      status: input.status,
    },
  });

  return response.data;
}

export async function getInternalPromotion(promotionId: string) {
  const response = await apiClient.get<{ promotion: InternalPromotion }>(`/internal/promotions/${promotionId}`);

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

export async function hardDeleteInternalPromotion(promotionId: string) {
  const response = await apiClient.delete<{ message: string; promotion: InternalPromotion }>(`/internal/promotions/${promotionId}`, {
    params: { mode: "hard" },
  });

  return response.data;
}

export async function restoreInternalPromotion(promotionId: string) {
  const response = await apiClient.patch<{ promotion: InternalPromotion }>(`/internal/promotions/${promotionId}/restore`);

  return response.data;
}

export async function getInternalPromotionMedia(promotionId: string) {
  const response = await apiClient.get<{ media: InternalPromotionMedia[] }>(`/internal/promotions/${promotionId}/media`);

  return response.data;
}

export async function uploadInternalPromotionMedia(promotionId: string, input: { files: File[]; isCover?: boolean; title?: string }) {
  const formData = new FormData();

  for (const file of input.files) {
    formData.append("files", file);
  }

  formData.append("isCover", input.isCover ? "1" : "0");
  if (input.title) {
    formData.append("title", input.title);
  }

  const response = await apiClient.post<{ media: InternalPromotionMedia[] }>(`/internal/promotions/${promotionId}/media`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function deleteInternalPromotionMedia(promotionId: string, mediaId: string) {
  const response = await apiClient.delete<{ media: InternalPromotionMedia }>(`/internal/promotions/${promotionId}/media/${mediaId}`);

  return response.data;
}

export async function setInternalPromotionMediaCover(promotionId: string, mediaId: string) {
  const response = await apiClient.patch<{ media: InternalPromotionMedia }>(`/internal/promotions/${promotionId}/media/${mediaId}/cover`);

  return response.data;
}

