import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, getCurrentAdministrativeStaff } from "@/lib/server/auth";

export async function requireAdministrativeStaffPage(redirectTo = "/internal") {
  const cookieStore = await cookies();
  const user = await getCurrentAdministrativeStaff(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!user) {
    redirect(`/internal/login?next=${encodeURIComponent(redirectTo)}`);
  }

  return user;
}
