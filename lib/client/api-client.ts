import axios, { AxiosError } from "axios";

import type { HealthResponse } from "@/lib/shared/health";

export type ApiError = {
  message: string;
  status?: number;
};

export const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ database?: { message?: string }; message?: string }>) => {
    const normalizedError: ApiError = {
      message:
        error.response?.data?.database?.message ??
        error.response?.data?.message ??
        error.message ??
        "Request failed.",
      status: error.response?.status,
    };

    return Promise.reject(normalizedError);
  },
);

export async function getHealth() {
  const response = await apiClient.get<HealthResponse>("/health");

  return response.data;
}
