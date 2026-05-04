import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { PromotionManager } from "@/components/internal/promotion-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý khuyến mãi | Online Travel Services",
};

export default async function InternalPromotionsPage() {
  const user = await requireAdministrativeStaffPage("/internal/promotions");

  return (
    <InternalShell user={user}>
      <PromotionManager />
    </InternalShell>
  );
}
