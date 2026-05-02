import { cookies } from "next/headers";

import {
  CustomerPortalShell,
  type SidebarPreference,
} from "@/components/customer-facing/customer-portal-shell";

const LEFT_SIDEBAR_COOKIE_KEY = "online-travel-sidebar-open";
const RIGHT_SIDEBAR_COOKIE_KEY = "online-travel-right-sidebar-open";

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

export default async function Home() {
  const cookieStore = await cookies();
  const initialLeftSidebar = parseSidebarPreference(
    cookieStore.get(LEFT_SIDEBAR_COOKIE_KEY)?.value,
  );
  const initialRightSidebar = parseSidebarPreference(
    cookieStore.get(RIGHT_SIDEBAR_COOKIE_KEY)?.value,
  );

  return (
    <CustomerPortalShell
      initialLeftSidebar={initialLeftSidebar}
      initialRightSidebar={initialRightSidebar}
    />
  );
}
