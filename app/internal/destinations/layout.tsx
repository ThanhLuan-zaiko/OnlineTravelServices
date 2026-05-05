import type { ReactNode } from "react";

import { InternalShell } from "@/components/internal/internal-shell";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";
import { DestinationManagerWorkspace } from "@/components/internal/destination-manager-workspace";

export const dynamic = "force-dynamic";

type DestinationsLayoutProps = {
  children: ReactNode;
};

export default async function DestinationsLayout({ children }: DestinationsLayoutProps) {
  const user = await requireAdministrativeStaffPage("/internal/destinations");

  return (
    <InternalShell user={user}>
      <DestinationManagerWorkspace />
      {children}
    </InternalShell>
  );
}
