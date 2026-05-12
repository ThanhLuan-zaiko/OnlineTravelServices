"use client";

import { useState } from "react";

import type { PublicTourFeed } from "@/lib/shared/public-tours";

import { CustomerHeader } from "./customer-header";
import { CustomerMainContent } from "./customer-main-content";
import { CustomerRightSidebar } from "./customer-right-sidebar";
import { CustomerSidebar } from "./customer-sidebar";
import { useThemeController } from "./theme-controller";

const LEFT_SIDEBAR_COOKIE_KEY = "online-travel-sidebar-open";
const RIGHT_SIDEBAR_COOKIE_KEY = "online-travel-right-sidebar-open";
const DESKTOP_MEDIA_QUERY = "(min-width: 1024px)";

export type SidebarPreference = "auto" | "open" | "closed";

type CustomerPortalShellProps = {
  feed?: PublicTourFeed;
  initialLeftSidebar: SidebarPreference;
  initialRightSidebar: SidebarPreference;
};

function isDesktopViewport() {
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

function writeSidebarCookie(key: string, preference: Exclude<SidebarPreference, "auto">) {
  document.cookie = `${key}=${preference === "open" ? "true" : "false"}; path=/; max-age=31536000; samesite=lax`;
}

function toggleSidebarPreference(current: SidebarPreference) {
  if (current === "auto") {
    return isDesktopViewport() ? "closed" : "open";
  }

  return current === "open" ? "closed" : "open";
}

export function CustomerPortalShell({
  feed = "all",
  initialLeftSidebar,
  initialRightSidebar,
}: CustomerPortalShellProps) {
  const [leftSidebar, setLeftSidebar] =
    useState<SidebarPreference>(initialLeftSidebar);
  const [rightSidebar, setRightSidebar] =
    useState<SidebarPreference>(initialRightSidebar);

  useThemeController();

  const handleToggleLeftSidebar = () => {
    const nextPreference = toggleSidebarPreference(leftSidebar);
    setLeftSidebar(nextPreference);
    writeSidebarCookie(LEFT_SIDEBAR_COOKIE_KEY, nextPreference);

    if (!isDesktopViewport() && nextPreference === "open") {
      setRightSidebar("closed");
      writeSidebarCookie(RIGHT_SIDEBAR_COOKIE_KEY, "closed");
    }
  };

  const handleToggleRightSidebar = () => {
    const nextPreference = toggleSidebarPreference(rightSidebar);
    setRightSidebar(nextPreference);
    writeSidebarCookie(RIGHT_SIDEBAR_COOKIE_KEY, nextPreference);

    if (!isDesktopViewport() && nextPreference === "open") {
      setLeftSidebar("closed");
      writeSidebarCookie(LEFT_SIDEBAR_COOKIE_KEY, "closed");
    }
  };

  const handleCloseLeftSidebar = () => {
    setLeftSidebar("closed");
    writeSidebarCookie(LEFT_SIDEBAR_COOKIE_KEY, "closed");
  };

  const handleCloseRightSidebar = () => {
    setRightSidebar("closed");
    writeSidebarCookie(RIGHT_SIDEBAR_COOKIE_KEY, "closed");
  };

  return (
    <main className="min-h-dvh bg-white text-slate-950 transition-colors dark:bg-black dark:text-neutral-50">
      <CustomerHeader
        leftSidebar={leftSidebar}
        onToggleLeftSidebar={handleToggleLeftSidebar}
        onToggleRightSidebar={handleToggleRightSidebar}
        rightSidebar={rightSidebar}
      />
      <div className="mx-auto flex w-full max-w-screen-2xl">
        <CustomerSidebar
          onClose={handleCloseLeftSidebar}
          sidebarPreference={leftSidebar}
        />
        <CustomerMainContent feed={feed} />
        <CustomerRightSidebar
          onClose={handleCloseRightSidebar}
          sidebarPreference={rightSidebar}
        />
      </div>
    </main>
  );
}
