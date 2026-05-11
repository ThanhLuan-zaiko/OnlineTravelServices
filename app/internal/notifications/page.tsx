import type { Metadata } from "next";

import { InternalShell } from "@/components/internal/internal-shell";
import { NotificationManager } from "@/components/internal/notification-manager";
import { requireAdministrativeStaffPage } from "@/lib/server/internal-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Thông báo | Online Travel Services",
};

export default async function InternalNotificationsPage() {
  const user = await requireAdministrativeStaffPage("/internal/notifications");

  return (
    <InternalShell user={user}>
      <NotificationManager />
    </InternalShell>
  );
}
