import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard, type OperationsTab } from "@/components/internal/operations-dashboard";
import { requireOperationsStatisticsStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trạng thái vận hành tour | Online Travel Services",
};

const allowedTabs = ["status", "events"] satisfies OperationsTab[];

type RouteContext = {
  params: Promise<{
    tab: string;
  }>;
};

export default async function InternalOperationsToursTabPage(context: RouteContext) {
  const { tab } = await context.params;

  if (!(allowedTabs as readonly string[]).includes(tab)) {
    notFound();
  }

  const user = await requireOperationsStatisticsStaffPage(`/internal/operations/tours/${tab}`);

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="tours" tab={tab as OperationsTab} />
    </InternalShell>
  );
}
