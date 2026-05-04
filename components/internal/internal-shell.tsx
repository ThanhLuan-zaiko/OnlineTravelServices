"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  FiBarChart2,
  FiCalendar,
  FiGift,
  FiHome,
  FiLogOut,
  FiMenu,
  FiPackage,
  FiX,
} from "react-icons/fi";

import { ThemeToggle, useThemeController } from "@/components/customer-facing/theme-controller";
import { internalSessionQueryKey } from "@/hooks/use-internal-session";
import { logoutInternalAccount } from "@/lib/client/api-client";
import type { AuthUser } from "@/lib/shared/auth";

const navItems = [
  { href: "/internal", icon: FiHome, label: "Tổng quan" },
  { href: "/internal/tours", icon: FiPackage, label: "Quản lý tour" },
  { href: "/internal/revenue", icon: FiBarChart2, label: "Doanh thu tour" },
  { href: "/internal/schedules", icon: FiCalendar, label: "Lịch trình" },
  { href: "/internal/promotions", icon: FiGift, label: "Khuyến mãi" },
];

type InternalShellProps = {
  children: ReactNode;
  user: AuthUser;
};

export function InternalShell({ children, user }: InternalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  useThemeController();

  const handleLogout = async () => {
    await logoutInternalAccount();
    queryClient.setQueryData(internalSessionQueryKey, { user: null });
    router.replace("/internal/login?next=/internal");
    router.refresh();
  };

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white dark:border-neutral-900 dark:bg-black">
      <div className="border-b border-slate-200 px-5 py-5 dark:border-neutral-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
          Online Travel
        </p>
        <h1 className="mt-1 text-lg font-semibold text-slate-950 dark:text-neutral-50">
          Trang nội bộ
        </h1>
      </div>
      <nav className="flex flex-1 flex-col gap-2 overflow-y-auto p-4" aria-label="Điều hướng nội bộ">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/internal" && pathname.startsWith(item.href));

          return (
            <Link
              className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                active
                  ? "bg-slate-950 text-white dark:bg-white dark:text-black"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-50"
              }`}
              href={item.href}
              key={item.href}
              onClick={() => setIsOpen(false)}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-4 dark:border-neutral-900">
        <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800">
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">{user.fullName}</p>
          <p className="mt-1 truncate text-xs text-slate-500 dark:text-neutral-400">{user.email}</p>
        </div>
        <button
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
          onClick={handleLogout}
          type="button"
        >
          <FiLogOut size={17} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );

  return (
    <main className="min-h-dvh bg-slate-50 text-slate-950 dark:bg-black dark:text-neutral-50">
      <div className="lg:hidden">
        {isOpen ? (
          <button
            aria-label="Đóng điều hướng"
            className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm dark:bg-black/60"
            onClick={() => setIsOpen(false)}
            type="button"
          />
        ) : null}
        <div
          className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebar}
        </div>
      </div>

      <div className="flex min-h-dvh">
        <div className="hidden lg:block lg:shrink-0">{sidebar}</div>
        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-50/90 px-4 py-3 backdrop-blur dark:border-neutral-900 dark:bg-black/90 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <button
                aria-label="Mở điều hướng"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 lg:hidden"
                onClick={() => setIsOpen(true)}
                type="button"
              >
                {isOpen ? <FiX size={18} /> : <FiMenu size={18} />}
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  AdministrativeStaff
                </p>
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">
                  Quản trị vận hành tour
                </p>
              </div>
              <ThemeToggle />
            </div>
          </header>
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-5 sm:px-6 lg:py-7">{children}</div>
        </section>
      </div>
    </main>
  );
}
