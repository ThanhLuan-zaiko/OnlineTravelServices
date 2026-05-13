import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard, type OperationsTab } from "@/components/internal/operations-dashboard";
import { requireOperationsAccessPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thống kê khách và địa điểm | Online Travel Services",
};

const allowedTabs = ["visits", "performance"] satisfies OperationsTab[];

type RouteContext = {
  params: Promise<{
    tab: string;
  }>;
};

export default async function InternalOperationsStatisticsTabPage(context: RouteContext) {
  const { tab } = await context.params;

  if (!(allowedTabs as readonly string[]).includes(tab)) {
    notFound();
  }

  const user = await requireOperationsAccessPage(`/internal/operations/statistics/${tab}`);

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="statistics" tab={tab as OperationsTab} />
    </InternalShell>
  );
}
