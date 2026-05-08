import type { InternalRevenueResponse } from "@/lib/shared/internal";

import { apiClient } from "./core";
export async function getInternalRevenue(input?: { day?: string; month?: string }) {
  const response = await apiClient.get<{ revenue: InternalRevenueResponse }>("/internal/revenue", {
    params: input,
  });

  return response.data;
}
