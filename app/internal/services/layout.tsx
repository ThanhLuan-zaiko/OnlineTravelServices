import type { ReactNode } from "react";

import { InternalShell } from "@/components/internal/internal-shell";
import { ServiceManager } from "@/components/internal/service-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export default async function InternalServicesLayout({ children }: { children: ReactNode }) {
  const user = await requireAdministrativeStaffPage("/internal/services");

  return (
    <InternalShell user={user}>
      <ServiceManager />
      {children}
    </InternalShell>
  );
}
