import type {
  InternalTourApproval,
  TourApprovalDecisionRequest,
  TourApprovalMutationRequest,
} from "@/lib/shared/internal";

import { apiClient } from "./core";

export async function getInternalTourApprovalPage(input: {
  cursor?: string | null;
  limit?: number;
  q?: string;
  status?: string;
}) {
  const response = await apiClient.get<{ approvals: InternalTourApproval[]; nextCursor: string | null }>(
    "/internal/tour-approvals",
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

export async function getInternalTourApproval(approvalId: string) {
  const response = await apiClient.get<{ approval: InternalTourApproval }>(`/internal/tour-approvals/${approvalId}`);

  return response.data;
}

export async function createInternalTourApproval(input: TourApprovalMutationRequest) {
  const response = await apiClient.post<{ approval: InternalTourApproval }>("/internal/tour-approvals", input);

  return response.data;
}

export async function decideInternalTourApproval(approvalId: string, input: TourApprovalDecisionRequest) {
  const response = await apiClient.post<{ approval: InternalTourApproval }>(
    `/internal/tour-approvals/${approvalId}/decision`,
    input,
  );

  return response.data;
}
