import type { ReactNode } from "react";

import { InternalShell } from "@/components/internal/internal-shell";
import { PromotionManager } from "@/components/internal/promotion-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export default async function InternalPromotionsLayout({ children }: { children: ReactNode }) {
  const user = await requireAdministrativeStaffPage("/internal/promotions");

  return (
    <InternalShell user={user}>
      <PromotionManager />
      {children}
    </InternalShell>
  );
}
