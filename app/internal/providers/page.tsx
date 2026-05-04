import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { ServiceProviderManager } from "@/components/internal/service-provider-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý nhà cung cấp | Online Travel Services",
};

export default async function InternalProvidersPage() {
  const user = await requireAdministrativeStaffPage("/internal/providers");

  return (
    <InternalShell user={user}>
      <ServiceProviderManager />
    </InternalShell>
  );
}
