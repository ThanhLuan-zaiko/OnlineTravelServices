import type { ReactNode } from "react";

import { CustomerManager } from "@/components/internal/customer-manager";
import { InternalShell } from "@/components/internal/internal-shell";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export default async function InternalCustomersLayout({ children }: { children: ReactNode }) {
  const user = await requireAdministrativeStaffPage("/internal/customers");

  return (
    <InternalShell user={user}>
      <CustomerManager />
      {children}
    </InternalShell>
  );
}
