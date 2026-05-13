"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getCurrentInternalAccount,
  type ApiError,
} from "@/lib/client/api-client";
import type { AuthUser } from "@/lib/shared/auth";

export const internalSessionQueryKey = ["internal", "session"] as const;

export type InternalSession = {
  user: (AuthUser & { permissions?: string[] }) | null;
};

async function fetchInternalSession(): Promise<InternalSession> {
  try {
    return await getCurrentInternalAccount();
  } catch (error) {
    if ((error as ApiError | undefined)?.status === 401) {
      return { user: null };
    }

    throw error;
  }
}

export function useInternalSession() {
  return useQuery({
    queryKey: internalSessionQueryKey,
    queryFn: fetchInternalSession,
    retry: false,
  });
}
