import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { InternalAccountForm } from "@/components/internal/internal-account-form";
import { InternalShell } from "@/components/internal/internal-shell";
import { AUTH_COOKIE_NAME, AuthError } from "@/lib/server/auth";
import { getCurrentAdministrativeStaffProfile } from "@/lib/server/internal-account";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tài khoản nội bộ | Online Travel Services",
};

export default async function InternalAccountPage() {
  const cookieStore = await cookies();

  try {
    const profile = await getCurrentAdministrativeStaffProfile(cookieStore.get(AUTH_COOKIE_NAME)?.value);

    return (
      <InternalShell user={profile}>
        <InternalAccountForm profile={profile} />
      </InternalShell>
    );
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      redirect("/internal/login?next=/internal/account");
    }

    throw error;
  }
}
