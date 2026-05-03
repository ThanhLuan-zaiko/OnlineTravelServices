import axios, { AxiosError } from "axios";

import type {
  AccountProfileRequest,
  AccountProfileResponse,
  AuthMessageResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "@/lib/shared/auth";
import type { HealthResponse } from "@/lib/shared/health";

export type ApiError = {
  fields?: string[];
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
  (error: AxiosError<{ database?: { message?: string }; fields?: string[]; message?: string }>) => {
    const normalizedError: ApiError = {
      fields: error.response?.data?.fields,
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

export async function registerCustomerAccount(input: RegisterRequest) {
  const response = await apiClient.post<AuthResponse>("/auth/register", input);

  return response.data;
}

export async function loginCustomerAccount(input: LoginRequest) {
  const response = await apiClient.post<AuthResponse>("/auth/login", input);

  return response.data;
}

export async function logoutCustomerAccount() {
  const response = await apiClient.post<AuthMessageResponse>("/auth/logout");

  return response.data;
}

export async function getCurrentCustomerAccount() {
  const response = await apiClient.get<AuthResponse>("/auth/me");

  return response.data;
}

export async function getAccountProfile() {
  const response = await apiClient.get<AccountProfileResponse>("/account");

  return response.data;
}

export async function updateAccountProfile(input: AccountProfileRequest) {
  const response = await apiClient.patch<AccountProfileResponse>("/account", input);

  return response.data;
}
