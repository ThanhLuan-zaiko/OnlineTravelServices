import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_COOKIE_NAME,
  getCurrentAdministrativeStaff,
  getCurrentInternalStaff,
} from "@/lib/server/auth";
import {
  ADMINISTRATIVE_STAFF_ROLE,
  OPERATIONS_STATISTICS_STAFF_ROLE,
} from "@/lib/server/auth-constants";
import {
  assertOperationsAccess,
  assertSuperAdminStaff,
  getStaffAccessDetails,
} from "@/lib/server/internal-staff-access";

export async function requireAdministrativeStaffPage(redirectTo = "/internal") {
  const cookieStore = await cookies();
  const user = await getCurrentAdministrativeStaff(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!user) {
    redirect(`/internal/login?next=${encodeURIComponent(redirectTo)}`);
  }

  try {
    return await getStaffAccessDetails(user);
  } catch {
    redirect(`/internal/login?next=${encodeURIComponent(redirectTo)}`);
  }
}

export async function requireSuperAdminStaffPage(redirectTo = "/internal/admin") {
  const user = await requireAdministrativeStaffPage(redirectTo);

  try {
    await assertSuperAdminStaff(user);
  } catch {
    redirect("/internal");
  }

  return user;
}

export async function requireInternalStaffPage(redirectTo = "/internal") {
  const cookieStore = await cookies();
  const user = await getCurrentInternalStaff(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!user) {
    redirect(`/internal/login?next=${encodeURIComponent(redirectTo)}`);
  }

  try {
    return await getStaffAccessDetails(user);
  } catch {
    redirect(`/internal/login?next=${encodeURIComponent(redirectTo)}`);
  }
}

export async function requireOperationsStatisticsStaffPage(redirectTo = "/internal/operations") {
  const user = await requireInternalStaffPage(redirectTo);

  if (user.role !== OPERATIONS_STATISTICS_STAFF_ROLE) {
    redirect("/internal");
  }

  return user;
}

export async function requireOperationsAccessPage(redirectTo = "/internal/operations") {
  const user = await requireInternalStaffPage(redirectTo);

  if (user.role !== ADMINISTRATIVE_STAFF_ROLE && user.role !== OPERATIONS_STATISTICS_STAFF_ROLE) {
    redirect("/internal");
  }

  try {
    await assertOperationsAccess(user);
  } catch {
    redirect("/internal");
  }

  return user;
}
