import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_COOKIE_NAME,
  getCurrentAdministrativeStaff,
  getCurrentInternalStaff,
} from "@/lib/server/auth";
import { OPERATIONS_STATISTICS_STAFF_ROLE } from "@/lib/server/auth-constants";

export async function requireAdministrativeStaffPage(redirectTo = "/internal") {
  const cookieStore = await cookies();
  const user = await getCurrentAdministrativeStaff(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!user) {
    redirect(`/internal/login?next=${encodeURIComponent(redirectTo)}`);
  }

  return user;
}

export async function requireInternalStaffPage(redirectTo = "/internal") {
  const cookieStore = await cookies();
  const user = await getCurrentInternalStaff(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!user) {
    redirect(`/internal/login?next=${encodeURIComponent(redirectTo)}`);
  }

  return user;
}

export async function requireOperationsStatisticsStaffPage(redirectTo = "/internal/operations") {
  const user = await requireInternalStaffPage(redirectTo);

  if (user.role !== OPERATIONS_STATISTICS_STAFF_ROLE) {
    redirect("/internal");
  }

  return user;
}
