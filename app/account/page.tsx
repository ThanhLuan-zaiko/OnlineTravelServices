import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AccountProfileForm } from "@/components/customer-facing/account-profile-form";
import { AUTH_COOKIE_NAME, AuthError, getCurrentCustomerProfile } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const cookieStore = await cookies();
  let profile;

  try {
    profile = await getCurrentCustomerProfile(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      redirect("/login?next=/account");
    }

    throw error;
  }

  return <AccountProfileForm profile={profile} />;
}
