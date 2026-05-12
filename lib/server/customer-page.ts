import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME, getCurrentCustomer } from "@/lib/server/auth";

export async function requireCustomerPage(redirectTo: string) {
  const cookieStore = await cookies();
  const user = await getCurrentCustomer(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(redirectTo)}`);
  }

  return user;
}
