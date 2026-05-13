"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClipboard,
  FiFileText,
  FiGift,
  FiHome,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiMapPin,
  FiShield,
  FiTruck,
  FiTool,
  FiUsers,
} from "react-icons/fi";

import { ThemeToggle, useThemeController } from "@/components/customer-facing/theme-controller";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { internalSessionQueryKey } from "@/hooks/use-internal-session";
import { logoutInternalAccount } from "@/lib/client/api-client";
import type { AuthUser } from "@/lib/shared/auth";

const navItems = [
  { href: "/internal", icon: FiHome, label: "Tổng quan" },
  { href: "/internal/admin", icon: FiShield, label: "Admin tổng", permission: "staff:manage" },
  { href: "/internal/operations", icon: FiBarChart2, label: "Vận hành & thống kê", permission: "operations:access" },
  { href: "/internal/tours", icon: FiPackage, label: "Quản lý tour", permission: "tour:manage" },
  { href: "/internal/suggested-tours", icon: FiClipboard, label: "Tour đề xuất", permission: "suggested_tour:manage" },
  { href: "/internal/tour-approvals", icon: FiFileText, label: "Phê duyệt", permission: "tour_approval:manage" },
  { href: "/internal/destinations", icon: FiMapPin, label: "Quản lý địa điểm tour", permission: "destination:manage" },
  { href: "/internal/vehicle-catalog", icon: FiGrid, label: "Danh mục phương tiện", permission: "vehicle_catalog:manage" },
  { href: "/internal/services", icon: FiTool, label: "Quản lý dịch vụ đi kèm", permission: "service:manage" },
  { href: "/internal/providers", icon: FiTruck, label: "Nhà cung cấp", permission: "provider:manage" },
  { href: "/internal/customers", icon: FiUsers, label: "Khách hàng", permission: "customer:manage" },
  { href: "/internal/revenue", icon: FiBarChart2, label: "Doanh thu tour", permission: "revenue:read" },
  { href: "/internal/schedules", icon: FiCalendar, label: "Lịch trình", permission: "schedule:manage" },
  { href: "/internal/promotions", icon: FiGift, label: "Khuyến mãi", permission: "promotion:manage" },
  { href: "/internal/notifications", icon: FiBell, label: "Thông báo", permission: "notification:read" },
  { href: "/internal/audit", icon: FiFileText, label: "Audit", permission: "audit:read" },
];

const COLLAPSED_STORAGE_KEY = "internal-shell-collapsed";

type InternalShellProps = {
  children: ReactNode;
  user: AuthUser & { permissions?: string[] };
};

type UnsavedChangesContextValue = {
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function useInternalUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);

  if (!context) {
    throw new Error("useInternalUnsavedChanges must be used within InternalShell.");
  }

  return context;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function InternalShell({ children, user }: InternalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === "1";
  });

  useThemeController();

  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_STORAGE_KEY, isCollapsed ? "1" : "0");
  }, [isCollapsed]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleClickCapture = (event: MouseEvent) => {
      if (!isDirty || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href") ?? "";

      if (!href.startsWith("/")) {
        return;
      }

      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      event.preventDefault();
      setPendingHref(href);
      setIsLeaveModalOpen(true);
    };

    document.addEventListener("click", handleClickCapture, true);

    return () => document.removeEventListener("click", handleClickCapture, true);
  }, [isDirty]);

  const initials = useMemo(() => getInitials(user.fullName), [user.fullName]);
  const visibleNavItems = useMemo(() => {
    const permissions = new Set(user.permissions ?? []);

    return navItems.filter((item) => item.href === "/internal" || (item.permission && permissions.has(item.permission)));
  }, [user.permissions]);
  const handleLogout = async () => {
    await logoutInternalAccount();
    queryClient.setQueryData(internalSessionQueryKey, { user: null });
    router.replace("/internal/login?next=/internal");
    router.refresh();
  };

  const closeLeaveModal = () => {
    setIsLeaveModalOpen(false);
    setPendingHref(null);
  };

  const confirmLeave = () => {
    if (pendingHref) {
      setIsDirty(false);
      setIsLeaveModalOpen(false);
      router.push(pendingHref);
      setPendingHref(null);
      return;
    }

    closeLeaveModal();
  };

  const sidebar = (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-dvh flex-col overflow-hidden border-r border-slate-200 bg-white transition-[width,transform] duration-300 ease-out dark:border-neutral-800 dark:bg-black ${
        isCollapsed ? "lg:w-20" : "lg:w-72"
      } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
    >
      <div className={`flex items-center gap-3 border-b border-slate-200 px-4 py-4 dark:border-neutral-800 ${isCollapsed ? "lg:justify-center" : "lg:justify-between"}`}>
        <div className={`flex min-w-0 items-center gap-3 transition-all duration-300 ${isCollapsed ? "lg:w-0 lg:overflow-hidden lg:opacity-0" : "opacity-100"}`}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-sky-300">
            <FiHome size={19} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
              Online Travel
            </p>
            <h1 className="mt-1 truncate text-lg font-semibold text-slate-950 dark:text-neutral-50">
              Trang nội bộ
            </h1>
          </div>
        </div>

        <button
          aria-label={isCollapsed ? "Mở sidebar" : "Thu gọn sidebar"}
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-transform duration-300 hover:-translate-y-0.5 hover:text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:text-sky-300 lg:inline-flex"
          onClick={() => setIsCollapsed((current) => !current)}
          type="button"
        >
          {isCollapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden p-3" aria-label="Điều hướng nội bộ">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/internal" && pathname.startsWith(item.href));

          return (
            <Link
              className={`group flex h-12 items-center gap-3 rounded-2xl border px-3 text-sm font-semibold transition-all duration-300 ${
                active
                  ? "border-sky-200 bg-white text-sky-800 dark:border-sky-900 dark:bg-black dark:text-sky-200"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-sky-800 dark:text-neutral-400 dark:hover:border-neutral-800 dark:hover:bg-black dark:hover:text-neutral-50"
              } ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`}
              href={item.href}
              key={item.href}
              onClick={() => setIsMobileOpen(false)}
              title={item.label}
            >
              <Icon className="shrink-0 transition-transform duration-300 group-hover:scale-105" size={18} />
              <span
                className={`min-w-0 whitespace-nowrap transition-all duration-300 ${
                  isCollapsed ? "lg:max-w-0 lg:opacity-0" : "opacity-100"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-neutral-800">
        <div
          className={`rounded-2xl border border-slate-200 bg-white p-3 dark:border-neutral-800 dark:bg-black ${
            isCollapsed ? "lg:flex lg:items-center lg:justify-center lg:p-2" : ""
          }`}
        >
          <div className={`flex items-center gap-3 ${isCollapsed ? "lg:flex-col lg:gap-2" : ""}`}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-sky-300">
              {initials}
            </div>
            <div className={`min-w-0 ${isCollapsed ? "lg:w-0 lg:overflow-hidden lg:opacity-0" : ""}`}>
              <p className="truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">{user.fullName}</p>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-neutral-400">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:border-neutral-800 dark:bg-black dark:text-emerald-300">
                  {user.role}
                </span>
                <Link
                  className="text-xs font-semibold text-sky-700 transition hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
                  href="/internal/account"
                  onClick={() => setIsMobileOpen(false)}
                >
                  Cập nhật hồ sơ
                </Link>
              </div>
            </div>
          </div>
        </div>
        <button
          className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:text-rose-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:text-rose-300 ${
            isCollapsed ? "lg:px-0" : ""
          }`}
          onClick={handleLogout}
          type="button"
        >
          <FiLogOut size={17} />
          <span className={`transition-all duration-300 ${isCollapsed ? "lg:max-w-0 lg:opacity-0" : "opacity-100"}`}>
            Đăng xuất
          </span>
        </button>
      </div>
    </aside>
  );

  return (
    <UnsavedChangesContext.Provider value={{ isDirty, setIsDirty }}>
      <main
        className="min-h-dvh overflow-x-hidden bg-white text-slate-950 dark:bg-black dark:text-neutral-50"
        style={{ ["--sidebar-width" as string]: isCollapsed ? "5rem" : "18rem" }}
      >
        <ConfirmModal
          confirmLabel="Rời trang"
          description="Bạn đang có thay đổi chưa lưu. Nếu rời đi, dữ liệu vừa nhập có thể bị mất."
          open={isLeaveModalOpen}
          onCancel={closeLeaveModal}
          onConfirm={confirmLeave}
          title="Rời trang mà chưa lưu?"
        />

      <div className="lg:hidden">
        {isMobileOpen ? (
          <button
            aria-label="Đóng điều hướng"
            className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm dark:bg-black/55"
            onClick={() => setIsMobileOpen(false)}
            type="button"
          />
        ) : null}
        <div className={`fixed inset-y-0 left-0 z-40 w-72 transition-transform duration-300 ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          {sidebar}
        </div>
      </div>

      <div className="flex min-h-dvh">
        <div className="hidden lg:block">{sidebar}</div>
        <section className="min-w-0 flex-1 overflow-x-hidden lg:pl-[var(--sidebar-width)]">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-black sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  aria-label="Mở điều hướng"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-transform duration-300 hover:-translate-y-0.5 hover:text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:text-sky-300 lg:hidden"
                  onClick={() => setIsMobileOpen(true)}
                  type="button"
                >
                  <FiMenu size={18} />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-300">
                    {user.role === "operations_statistics_staff" ? "OperationsStaff" : "AdministrativeStaff"}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">
                    {user.role === "operations_statistics_staff" ? "Vận hành và thống kê tour" : "Quản trị vận hành tour"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
                  className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-transform duration-300 hover:-translate-y-0.5 hover:text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:text-sky-300 lg:inline-flex"
                  onClick={() => setIsCollapsed((current) => !current)}
                  type="button"
                >
                  {isCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
                  <span>{isCollapsed ? "Mở" : "Thu gọn"}</span>
                </button>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-5 sm:px-6 lg:py-7">{children}</div>
        </section>
      </div>
      </main>
    </UnsavedChangesContext.Provider>
  );
}
