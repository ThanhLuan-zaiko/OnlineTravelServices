import type {
  CustomerRewardMutationRequest,
  CustomerTierMutationRequest,
  InternalCustomerHistory,
  InternalCustomerProfile,
  InternalCustomerReward,
} from "@/lib/shared/internal";

import { apiClient } from "./core";

export async function getInternalCustomerPage(input: {
  cursor?: string | null;
  limit?: number;
  mode?: "all" | "status" | "tier" | "vip";
  q?: string;
  value?: string;
}) {
  const response = await apiClient.get<{ customers: InternalCustomerProfile[]; nextCursor: string | null }>(
    "/internal/customers",
    {
      params: {
        cursor: input.cursor ?? undefined,
        limit: input.limit,
        mode: input.mode,
        q: input.q?.trim() || undefined,
        value: input.value,
      },
    },
  );

  return response.data;
}

export async function getInternalCustomer(userId: string) {
  const response = await apiClient.get<{ customer: InternalCustomerProfile }>(`/internal/customers/${userId}`);

  return response.data;
}

export async function getInternalCustomerHistory(userId: string) {
  const response = await apiClient.get<{ history: InternalCustomerHistory[] }>(`/internal/customers/${userId}/history`);

  return response.data;
}

export async function getInternalCustomerRewards(userId: string) {
  const response = await apiClient.get<{ rewards: InternalCustomerReward[] }>(`/internal/customers/${userId}/rewards`);

  return response.data;
}

export async function updateInternalCustomerTier(userId: string, input: CustomerTierMutationRequest) {
  const response = await apiClient.patch<{ customer: InternalCustomerProfile }>(`/internal/customers/${userId}/tier`, input);

  return response.data;
}

export async function addInternalCustomerReward(userId: string, input: CustomerRewardMutationRequest) {
  const response = await apiClient.post<{ reward: InternalCustomerReward }>(`/internal/customers/${userId}/rewards`, input);

  return response.data;
}
