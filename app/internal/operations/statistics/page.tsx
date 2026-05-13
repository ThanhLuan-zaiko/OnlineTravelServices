import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard } from "@/components/internal/operations-dashboard";
import { requireOperationsAccessPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thống kê khách và địa điểm | Online Travel Services",
};

export default async function InternalOperationsStatisticsPage() {
  const user = await requireOperationsAccessPage("/internal/operations/statistics");

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="statistics" />
    </InternalShell>
  );
}
