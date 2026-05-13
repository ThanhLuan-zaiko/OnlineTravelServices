import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard } from "@/components/internal/operations-dashboard";
import { requireOperationsStatisticsStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thông báo khách hàng | Online Travel Services",
};

export default async function InternalOperationsNotificationsPage() {
  const user = await requireOperationsStatisticsStaffPage("/internal/operations/notifications");

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="notifications" />
    </InternalShell>
  );
}
