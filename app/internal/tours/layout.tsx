import type { ReactNode } from "react";

import { InternalShell } from "@/components/internal/internal-shell";
import { TourManager } from "@/components/internal/tour-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export default async function InternalToursLayout({ children }: { children: ReactNode }) {
  const user = await requireAdministrativeStaffPage("/internal/tours");

  return (
    <InternalShell user={user}>
      <TourManager />
      {children}
    </InternalShell>
  );
}
