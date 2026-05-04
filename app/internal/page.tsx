import type { Metadata } from "next";

import { InternalDashboard } from "@/components/internal/internal-dashboard";
import { InternalShell } from "@/components/internal/internal-shell";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tổng quan nội bộ | Online Travel Services",
};

export default async function InternalHomePage() {
  const user = await requireAdministrativeStaffPage("/internal");

  return (
    <InternalShell user={user}>
      <InternalDashboard />
    </InternalShell>
  );
}
