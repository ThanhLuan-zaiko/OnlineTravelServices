import { cookies } from "next/headers";
import type { Metadata } from "next";

import {
  CustomerPortalShell,
  type SidebarPreference,
} from "@/components/customer-facing/customer-portal-shell";

const LEFT_SIDEBAR_COOKIE_KEY = "online-travel-sidebar-open";
const RIGHT_SIDEBAR_COOKIE_KEY = "online-travel-right-sidebar-open";

export const metadata: Metadata = {
  title: "Du lịch nước ngoài | Online Travel Services",
  description: "Các tour du lịch nước ngoài đang mở bán.",
};

function parseSidebarPreference(
  value: string | undefined,
): SidebarPreference {
  if (value === "true") {
    return "open";
  }

  if (value === "false") {
    return "closed";
  }

  return "auto";
}

export default async function InternationalToursPage() {
  const cookieStore = await cookies();
  const initialLeftSidebar = parseSidebarPreference(
    cookieStore.get(LEFT_SIDEBAR_COOKIE_KEY)?.value,
  );
  const initialRightSidebar = parseSidebarPreference(
    cookieStore.get(RIGHT_SIDEBAR_COOKIE_KEY)?.value,
  );

  return (
    <CustomerPortalShell
      feed="international"
      initialLeftSidebar={initialLeftSidebar}
      initialRightSidebar={initialRightSidebar}
    />
  );
}
