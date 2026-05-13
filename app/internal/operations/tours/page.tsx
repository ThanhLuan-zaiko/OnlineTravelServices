import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard } from "@/components/internal/operations-dashboard";
import { requireOperationsStatisticsStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trạng thái vận hành tour | Online Travel Services",
};

export default async function InternalOperationsToursPage() {
  const user = await requireOperationsStatisticsStaffPage("/internal/operations/tours");

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="tours" />
    </InternalShell>
  );
}
