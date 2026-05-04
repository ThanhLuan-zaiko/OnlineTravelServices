import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { ServiceManager } from "@/components/internal/service-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý dịch vụ đi kèm | Online Travel Services",
};

export default async function InternalServicesPage() {
  const user = await requireAdministrativeStaffPage("/internal/services");

  return (
    <InternalShell user={user}>
      <ServiceManager />
    </InternalShell>
  );
}
