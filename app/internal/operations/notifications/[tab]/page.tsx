import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard, type OperationsTab } from "@/components/internal/operations-dashboard";
import { requireOperationsAccessPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thông báo khách hàng | Online Travel Services",
};

const allowedTabs = ["compose", "history"] satisfies OperationsTab[];

type RouteContext = {
  params: Promise<{
    tab: string;
  }>;
};

export default async function InternalOperationsNotificationsTabPage(context: RouteContext) {
  const { tab } = await context.params;

  if (!(allowedTabs as readonly string[]).includes(tab)) {
    notFound();
  }

  const user = await requireOperationsAccessPage(`/internal/operations/notifications/${tab}`);

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="notifications" tab={tab as OperationsTab} />
    </InternalShell>
  );
}
