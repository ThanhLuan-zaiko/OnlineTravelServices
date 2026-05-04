import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { TourManager } from "@/components/internal/tour-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý tour | Online Travel Services",
};

export default async function InternalToursPage() {
  const user = await requireAdministrativeStaffPage("/internal/tours");

  return (
    <InternalShell user={user}>
      <TourManager />
    </InternalShell>
  );
}
