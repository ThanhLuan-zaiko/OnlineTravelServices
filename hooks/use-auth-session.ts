"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getCurrentCustomerAccount,
  type ApiError,
} from "@/lib/client/api-client";
import type { AuthUser } from "@/lib/shared/auth";

export const authSessionQueryKey = ["auth", "session"] as const;

export type AuthSession = {
  user: AuthUser | null;
};

async function fetchAuthSession(): Promise<AuthSession> {
  try {
    return await getCurrentCustomerAccount();
  } catch (error) {
    if ((error as ApiError | undefined)?.status === 401) {
      return { user: null };
    }

    throw error;
  }
}

export function useAuthSession() {
  return useQuery({
    queryKey: authSessionQueryKey,
    queryFn: fetchAuthSession,
    retry: false,
  });
}
