import type {
  CustomerBookingHistoryResponse,
  CustomerPaymentHistoryResponse,
} from "@/lib/shared/customer-activity";

import { apiClient } from "./core";

export async function getCustomerBookingsPage(input: {
  cursor?: string | null;
  limit?: number;
  query?: string;
}) {
  const response = await apiClient.get<CustomerBookingHistoryResponse>("/customer/bookings", {
    params: {
      cursor: input.cursor ?? undefined,
      limit: input.limit,
      q: input.query || undefined,
    },
  });

  return response.data;
}

export async function getCustomerPaymentsPage(input: {
  cursor?: string | null;
  limit?: number;
  query?: string;
}) {
  const response = await apiClient.get<CustomerPaymentHistoryResponse>("/customer/payments", {
    params: {
      cursor: input.cursor ?? undefined,
      limit: input.limit,
      q: input.query || undefined,
    },
  });

  return response.data;
}
