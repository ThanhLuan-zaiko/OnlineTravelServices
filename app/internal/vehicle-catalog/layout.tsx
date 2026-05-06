import type { Metadata } from "next";
import type { ReactNode } from "react";

import { VehicleCatalogManager } from "@/components/internal/vehicle-catalog-manager";
import { InternalShell } from "@/components/internal/internal-shell";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Danh mục phương tiện | Online Travel Services",
};

type VehicleCatalogLayoutProps = {
  children: ReactNode;
};

export default async function InternalVehicleCatalogLayout({ children }: VehicleCatalogLayoutProps) {
  const user = await requireAdministrativeStaffPage("/internal/vehicle-catalog");

  return (
    <InternalShell user={user}>
      <VehicleCatalogManager />
      {children}
    </InternalShell>
  );
}
