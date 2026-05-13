import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard } from "@/components/internal/operations-dashboard";
import { requireOperationsStatisticsStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kiểm soát lịch trình | Online Travel Services",
};

export default async function InternalOperationsSchedulesPage() {
  const user = await requireOperationsStatisticsStaffPage("/internal/operations/schedules");

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="schedules" />
    </InternalShell>
  );
}
