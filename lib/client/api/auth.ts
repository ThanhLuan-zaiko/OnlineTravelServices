import type {
  AccountProfileRequest,
  AccountProfileResponse,
  AuthMessageResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "@/lib/shared/auth";
import type { HealthResponse } from "@/lib/shared/health";
import type { InternalAccountProfileRequest, InternalAccountProfileResponse, InternalLoginRequest } from "@/lib/shared/internal";

import { apiClient } from "./core";
export async function getHealth() {
  const response = await apiClient.get<HealthResponse>("/health");

  return response.data;
}

export async function registerCustomerAccount(input: RegisterRequest) {
  const response = await apiClient.post<AuthResponse>("/auth/register", input);

  return response.data;
}

export async function loginAccount(input: LoginRequest) {
  const response = await apiClient.post<AuthResponse>("/auth/login", input);

  return response.data;
}

export async function loginCustomerAccount(input: LoginRequest) {
  return loginAccount(input);
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

export async function loginInternalAccount(input: InternalLoginRequest) {
  const response = await apiClient.post<AuthResponse>("/internal/auth/login", input);

  return response.data;
}

export async function logoutInternalAccount() {
  const response = await apiClient.post<AuthMessageResponse>("/internal/auth/logout");

  return response.data;
}

export async function getCurrentInternalAccount() {
  const response = await apiClient.get<AuthResponse>("/internal/auth/me");

  return response.data;
}

export async function getCurrentInternalAccountProfile() {
  const response = await apiClient.get<InternalAccountProfileResponse>("/internal/account");

  return response.data;
}

export async function updateInternalAccountProfile(input: InternalAccountProfileRequest) {
  const response = await apiClient.patch<InternalAccountProfileResponse>("/internal/account", input);

  return response.data;
}

