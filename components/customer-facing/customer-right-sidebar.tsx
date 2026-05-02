"use client";

import { suggestionCards } from "./navigation-data";
import type { SidebarPreference } from "./customer-portal-shell";

type CustomerRightSidebarProps = {
  onClose: () => void;
  sidebarPreference: SidebarPreference;
};

export function CustomerRightSidebar({
  onClose,
  sidebarPreference,
}: CustomerRightSidebarProps) {
  const isExplicitlyOpen = sidebarPreference === "open";
  const panelClassName =
    sidebarPreference === "open"
      ? "translate-x-0 xl:w-96"
      : sidebarPreference === "closed"
        ? "translate-x-full xl:w-0 xl:translate-x-0"
        : "translate-x-full xl:w-96 xl:translate-x-0";

  return (
    <>
      {isExplicitlyOpen ? (
        <button
          aria-label="Đóng lớp phủ gợi ý"
          className="fixed inset-0 z-20 bg-slate-950/30 backdrop-blur-sm dark:bg-black/50 xl:hidden"
          onClick={onClose}
          type="button"
        />
      ) : null}

      <div
        className={`fixed right-0 top-[8.25rem] z-30 h-[calc(100dvh-8.25rem)] w-80 transition-transform duration-300 sm:top-20 sm:h-[calc(100dvh-5rem)] xl:sticky xl:top-20 xl:z-10 xl:h-auto xl:shrink-0 xl:overflow-hidden xl:border-l xl:border-slate-200 xl:transition-[width] xl:dark:border-neutral-900 ${panelClassName}`}
      >
        <aside className="h-full w-80 overflow-y-auto border-l border-slate-200 bg-white p-5 shadow-2xl dark:border-neutral-900 dark:bg-black xl:sticky xl:top-20 xl:h-[calc(100dvh-5rem)] xl:w-96 xl:border-l-0 xl:shadow-none">
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-violet-100 bg-white p-4 dark:border-neutral-800 dark:bg-black">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                Gợi ý
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950 dark:text-neutral-50">
                Dành cho bạn
              </h2>
            </div>

            {suggestionCards.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  className={`rounded-3xl border p-5 ${item.tone}`}
                  key={item.label}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-current dark:bg-black">
                      <Icon size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="mt-2 text-lg font-semibold leading-snug tracking-normal text-slate-950 dark:text-neutral-50">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}
