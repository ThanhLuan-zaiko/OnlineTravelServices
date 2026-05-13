import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InternalDashboard } from "@/components/internal/internal-dashboard";
import { InternalShell } from "@/components/internal/internal-shell";
import { OPERATIONS_STATISTICS_STAFF_ROLE } from "@/lib/server/auth-constants";
import { requireInternalStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tổng quan nội bộ | Online Travel Services",
};

export default async function InternalHomePage() {
  const user = await requireInternalStaffPage("/internal");

  if (user.role === OPERATIONS_STATISTICS_STAFF_ROLE) {
    redirect("/internal/operations");
  }

  return (
    <InternalShell user={user}>
      <InternalDashboard />
    </InternalShell>
  );
}
