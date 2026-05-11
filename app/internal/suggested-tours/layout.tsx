import type { ReactNode } from "react";

import { InternalShell } from "@/components/internal/internal-shell";
import { SuggestedTourManager } from "@/components/internal/suggested-tour-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export default async function InternalSuggestedToursLayout({ children }: { children: ReactNode }) {
  const user = await requireAdministrativeStaffPage("/internal/suggested-tours");

  return (
    <InternalShell user={user}>
      <SuggestedTourManager />
      {children}
    </InternalShell>
  );
}
