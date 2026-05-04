import type { Metadata } from "next";

import { DestinationManager } from "@/components/internal/destination-manager";
import { InternalShell } from "@/components/internal/internal-shell";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý địa điểm tour | Online Travel Services",
};

export default async function InternalDestinationsPage() {
  const user = await requireAdministrativeStaffPage("/internal/destinations");

  return (
    <InternalShell user={user}>
      <DestinationManager />
    </InternalShell>
  );
}
