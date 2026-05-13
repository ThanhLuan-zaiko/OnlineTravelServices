import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard, type OperationsTab } from "@/components/internal/operations-dashboard";
import { requireOperationsStatisticsStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Báo cáo thống kê | Online Travel Services",
};

const allowedTabs = ["editor", "list"] satisfies OperationsTab[];

type RouteContext = {
  params: Promise<{
    tab: string;
  }>;
};

export default async function InternalOperationsReportsTabPage(context: RouteContext) {
  const { tab } = await context.params;

  if (!(allowedTabs as readonly string[]).includes(tab)) {
    notFound();
  }

  const user = await requireOperationsStatisticsStaffPage(`/internal/operations/reports/${tab}`);

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="reports" tab={tab as OperationsTab} />
    </InternalShell>
  );
}
