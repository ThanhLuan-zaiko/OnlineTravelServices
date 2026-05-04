"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FiCalendar } from "react-icons/fi";

import { getInternalTours } from "@/lib/client/api-client";

import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

export function ScheduleOverview() {
  const toursQuery = useQuery({
    queryKey: ["internal", "tours", "schedule-overview"],
    queryFn: () => getInternalTours(),
  });
  const tours = toursQuery.data?.tours ?? [];

  return (
    <div className="space-y-5">
      <InternalPageHeader
        description="Chọn tour để quản lý lịch khởi hành và các mục lịch trình chi tiết theo ngày."
        title="Quản lý lịch trình"
      />
      <InternalPanel className="p-4">
        {tours.length === 0 ? (
          <EmptyState message={toursQuery.isLoading ? "Đang tải tour..." : "Chưa có tour để quản lý lịch trình."} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {tours.map((tour) => (
              <Link
                className="rounded-xl border border-slate-200 p-4 transition hover:border-sky-300 hover:bg-sky-50/50 dark:border-neutral-800 dark:hover:border-sky-900 dark:hover:bg-sky-950/20"
                href={`/internal/tours/${tour.tourId}`}
                key={tour.tourId}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-200">
                    <FiCalendar size={18} />
                  </span>
                  <StatusPill value={tour.status} />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-neutral-50">{tour.title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{tour.destinationName}</p>
              </Link>
            ))}
          </div>
        )}
      </InternalPanel>
    </div>
  );
}
