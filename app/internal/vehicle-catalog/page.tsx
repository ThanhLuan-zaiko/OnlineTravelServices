import type { Metadata } from "next";

import { VehicleCatalogManager } from "@/components/internal/vehicle-catalog-manager";
import { InternalShell } from "@/components/internal/internal-shell";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Danh mục phương tiện | Online Travel Services",
};

export default async function InternalVehicleCatalogPage() {
  const user = await requireAdministrativeStaffPage("/internal/vehicle-catalog");

  return (
    <InternalShell user={user}>
      <VehicleCatalogManager />
    </InternalShell>
  );
}
