import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { RevenueDashboard } from "@/components/internal/revenue-dashboard";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Doanh thu tour | Online Travel Services",
};

export default async function InternalRevenuePage() {
  const user = await requireAdministrativeStaffPage("/internal/revenue");

  return (
    <InternalShell user={user}>
      <RevenueDashboard />
    </InternalShell>
  );
}
