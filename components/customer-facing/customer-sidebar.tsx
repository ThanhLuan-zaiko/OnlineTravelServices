"use client";

import type { SidebarPreference } from "./customer-portal-shell";

import { sidebarItems } from "./navigation-data";

type CustomerSidebarProps = {
  onClose: () => void;
  sidebarPreference: SidebarPreference;
};

export function CustomerSidebar({
  onClose,
  sidebarPreference,
}: CustomerSidebarProps) {
  const isExplicitlyOpen = sidebarPreference === "open";
  const panelClassName =
    sidebarPreference === "open"
      ? "translate-x-0 lg:w-80"
      : sidebarPreference === "closed"
        ? "-translate-x-full lg:w-0 lg:translate-x-0"
        : "-translate-x-full lg:w-80 lg:translate-x-0";

  return (
    <>
      {isExplicitlyOpen ? (
        <button
          aria-label="Đóng lớp phủ menu"
          className="fixed inset-0 z-20 bg-slate-950/30 backdrop-blur-sm dark:bg-black/50 lg:hidden"
          onClick={onClose}
          type="button"
        />
      ) : null}

      <div
        className={`fixed left-0 top-[8.25rem] z-30 h-[calc(100dvh-8.25rem)] w-80 transition-transform duration-300 sm:top-20 sm:h-[calc(100dvh-5rem)] lg:sticky lg:top-20 lg:z-10 lg:shrink-0 lg:overflow-hidden lg:transition-[width] ${panelClassName}`}
      >
        <aside className="h-full w-80 border-r border-slate-200 bg-white shadow-2xl transition-transform dark:border-neutral-900 dark:bg-black lg:shadow-none">
          <div className="flex h-full flex-col gap-6 overflow-y-auto p-5">
            <div className="rounded-2xl border border-sky-100 bg-white p-4 dark:border-neutral-800 dark:bg-black">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                Điều hướng
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950 dark:text-neutral-50">
                Khám phá dịch vụ
              </h2>
            </div>

            <nav className="flex flex-col gap-2" aria-label="Danh mục chính">
              {sidebarItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    className="group flex w-full items-start gap-3 rounded-2xl border border-transparent p-3 text-left transition hover:border-slate-200 hover:bg-slate-50 dark:hover:border-neutral-800 dark:hover:bg-neutral-900"
                    key={item.label}
                    type="button"
                  >
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 transition ${item.tone}`}
                    >
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-950 dark:text-neutral-50">
                        {item.label}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-neutral-400">
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>
      </div>
    </>
  );
}
