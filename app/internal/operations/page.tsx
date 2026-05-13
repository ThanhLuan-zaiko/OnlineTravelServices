import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard } from "@/components/internal/operations-dashboard";
import { requireOperationsStatisticsStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vận hành và thống kê | Online Travel Services",
};

export default async function InternalOperationsPage() {
  const user = await requireOperationsStatisticsStaffPage("/internal/operations");

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="overview" />
    </InternalShell>
  );
}
