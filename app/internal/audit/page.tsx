import type { Metadata } from "next";

import { AuditManager } from "@/components/internal/audit-manager";
import { InternalShell } from "@/components/internal/internal-shell";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit log | Online Travel Services",
};

export default async function InternalAuditPage() {
  const user = await requireAdministrativeStaffPage("/internal/audit");

  return (
    <InternalShell user={user}>
      <AuditManager />
    </InternalShell>
  );
}
