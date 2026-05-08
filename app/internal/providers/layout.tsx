import type { ReactNode } from "react";

import { InternalShell } from "@/components/internal/internal-shell";
import { ServiceProviderManager } from "@/components/internal/service-provider-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

type InternalProvidersLayoutProps = {
  children: ReactNode;
};

export default async function InternalProvidersLayout({ children }: InternalProvidersLayoutProps) {
  const user = await requireAdministrativeStaffPage("/internal/providers");

  return (
    <InternalShell user={user}>
      <ServiceProviderManager />
      {children}
    </InternalShell>
  );
}
