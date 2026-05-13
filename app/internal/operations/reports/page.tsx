import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard } from "@/components/internal/operations-dashboard";
import { requireOperationsStatisticsStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Báo cáo thống kê | Online Travel Services",
};

export default async function InternalOperationsReportsPage() {
  const user = await requireOperationsStatisticsStaffPage("/internal/operations/reports");

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="reports" />
    </InternalShell>
  );
}
