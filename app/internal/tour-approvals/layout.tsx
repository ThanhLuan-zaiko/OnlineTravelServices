import type { ReactNode } from "react";

import { InternalShell } from "@/components/internal/internal-shell";
import { TourApprovalManager } from "@/components/internal/tour-approval-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export default async function InternalTourApprovalsLayout({ children }: { children: ReactNode }) {
  const user = await requireAdministrativeStaffPage("/internal/tour-approvals");

  return (
    <InternalShell user={user}>
      <TourApprovalManager />
      {children}
    </InternalShell>
  );
}
