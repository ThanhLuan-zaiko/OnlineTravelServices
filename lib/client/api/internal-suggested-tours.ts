import type {
  InternalSuggestedTour,
  SuggestedTourDecisionRequest,
  SuggestedTourMutationRequest,
} from "@/lib/shared/internal";

import { apiClient } from "./core";

export async function getInternalSuggestedTourPage(input: {
  cursor?: string | null;
  limit?: number;
  q?: string;
  status?: string;
}) {
  const response = await apiClient.get<{ nextCursor: string | null; suggestions: InternalSuggestedTour[] }>(
    "/internal/suggested-tours",
    {
      params: {
        cursor: input.cursor ?? undefined,
        limit: input.limit,
        q: input.q?.trim() || undefined,
        status: input.status,
      },
    },
  );

  return response.data;
}

export async function getInternalSuggestedTour(suggestionId: string) {
  const response = await apiClient.get<{ suggestion: InternalSuggestedTour }>(`/internal/suggested-tours/${suggestionId}`);

  return response.data;
}

export async function createInternalSuggestedTour(input: SuggestedTourMutationRequest) {
  const response = await apiClient.post<{ suggestion: InternalSuggestedTour }>("/internal/suggested-tours", input);

  return response.data;
}

export async function updateInternalSuggestedTour(suggestionId: string, input: SuggestedTourMutationRequest) {
  const response = await apiClient.patch<{ suggestion: InternalSuggestedTour }>(
    `/internal/suggested-tours/${suggestionId}`,
    input,
  );

  return response.data;
}

export async function decideInternalSuggestedTour(suggestionId: string, input: SuggestedTourDecisionRequest) {
  const response = await apiClient.post<{ suggestion: InternalSuggestedTour }>(
    `/internal/suggested-tours/${suggestionId}/decision`,
    input,
  );

  return response.data;
}
