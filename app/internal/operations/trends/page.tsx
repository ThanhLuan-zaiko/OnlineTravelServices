import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { OperationsDashboard } from "@/components/internal/operations-dashboard";
import { requireOperationsAccessPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Phân tích xu hướng | Online Travel Services",
};

export default async function InternalOperationsTrendsPage() {
  const user = await requireOperationsAccessPage("/internal/operations/trends");

  return (
    <InternalShell user={user}>
      <OperationsDashboard module="trends" />
    </InternalShell>
  );
}
