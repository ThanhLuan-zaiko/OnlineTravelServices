import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminDashboard } from "@/components/internal/admin-dashboard";
import { InternalShell } from "@/components/internal/internal-shell";
import { requireSuperAdminStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin tổng | Online Travel Services",
};

const allowedModules = ["audit", "customers", "operations", "revenue", "staff", "system"] as const;

type RouteContext = {
  params: Promise<{
    segments?: string[];
  }>;
};

export default async function InternalAdminPage(context: RouteContext) {
  const { segments = [] } = await context.params;

  if (segments[0] && !allowedModules.includes(segments[0] as (typeof allowedModules)[number])) {
    notFound();
  }

  const user = await requireSuperAdminStaffPage(`/internal/admin/${segments.join("/")}`);

  return (
    <InternalShell user={user}>
      <AdminDashboard segments={segments} />
    </InternalShell>
  );
}
