import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { ScheduleOverview } from "@/components/internal/schedule-overview";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý lịch trình | Online Travel Services",
};

export default async function InternalSchedulesPage() {
  const user = await requireAdministrativeStaffPage("/internal/schedules");

  return (
    <InternalShell user={user}>
      <ScheduleOverview />
    </InternalShell>
  );
}
