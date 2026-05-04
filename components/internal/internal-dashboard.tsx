"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FiArrowRight, FiBarChart2, FiCalendar, FiGift, FiPackage } from "react-icons/fi";

import { getInternalPromotions, getInternalRevenue, getInternalTours } from "@/lib/client/api-client";

import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

function money(value: string) {
  return Number(value).toLocaleString("vi-VN");
}

export function InternalDashboard() {
  const toursQuery = useQuery({
    queryKey: ["internal", "tours", "dashboard"],
    queryFn: () => getInternalTours(),
  });
  const promotionsQuery = useQuery({
    queryKey: ["internal", "promotions", "dashboard"],
    queryFn: () => getInternalPromotions(),
  });
  const revenueQuery = useQuery({
    queryKey: ["internal", "revenue", "dashboard"],
    queryFn: () => getInternalRevenue(),
  });
  const tours = toursQuery.data?.tours ?? [];
  const promotions = promotionsQuery.data?.promotions ?? [];
  const revenue = revenueQuery.data?.revenue;
  const stats = [
    {
      href: "/internal/tours",
      icon: FiPackage,
      label: "Tour đang quản lý",
      value: tours.length,
      tone:
        "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 dark:border-sky-950 dark:bg-sky-950/30 dark:text-sky-300",
    },
    {
      href: "/internal/revenue",
      icon: FiBarChart2,
      label: "Doanh thu tháng",
      value: `${money(revenue?.summary.totalRevenue ?? "0")} đ`,
      tone:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300",
    },
    {
      href: "/internal/schedules",
      icon: FiCalendar,
      label: "Đặt chỗ hôm nay",
      value: revenue?.summary.bookingCount ?? 0,
      tone:
        "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-300",
    },
    {
      href: "/internal/promotions",
      icon: FiGift,
      label: "Khuyến mãi",
      value: promotions.length,
      tone:
        "border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 dark:border-violet-950 dark:bg-violet-950/30 dark:text-violet-300",
    },
  ];

  return (
    <div className="space-y-5">
      <InternalPageHeader
        description="Theo dõi nhanh dữ liệu vận hành và truy cập các khu vực quản trị dành cho nhân sự hành chính."
        title="Tổng quan nội bộ"
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <Link
              className={`group rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 ${stat.tone}`}
              href={stat.href}
              key={stat.label}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/80 text-current transition group-hover:scale-105 dark:bg-black/20">
                  <Icon size={18} />
                </span>
                <FiArrowRight className="opacity-60 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:opacity-100" size={17} />
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-current">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-current/80">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <InternalPanel className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Tour cập nhật gần đây</h3>
            <Link className="text-sm font-semibold text-sky-700 dark:text-sky-300" href="/internal/tours">
              Xem tất cả
            </Link>
          </div>
          {tours.length === 0 ? (
            <EmptyState message="Chưa có tour trong dữ liệu quản trị." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500 dark:text-neutral-500">
                  <tr>
                    <th className="px-3 py-3">Tour</th>
                    <th className="px-3 py-3">Điểm đến</th>
                    <th className="px-3 py-3">Giá</th>
                    <th className="px-3 py-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
                  {tours.slice(0, 6).map((tour) => (
                    <tr key={tour.tourId}>
                      <td className="px-3 py-3 font-semibold text-slate-950 dark:text-neutral-50">{tour.title}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">{tour.destinationName}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">
                        {money(tour.basePrice)} {tour.currency}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill value={tour.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </InternalPanel>

        <InternalPanel className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Hiệu suất tour</h3>
            <Link className="text-sm font-semibold text-sky-700 dark:text-sky-300" href="/internal/revenue">
              Chi tiết
            </Link>
          </div>
          {revenue?.tourPerformance.length ? (
            <div className="space-y-3">
              {revenue.tourPerformance.slice(0, 5).map((tour) => (
                <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={tour.tourId}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950 dark:text-neutral-50">{tour.title}</p>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {money(tour.revenue)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                    {tour.bookingCount} booking, {tour.guestCount} khách
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Chưa có thống kê hiệu suất tháng này." />
          )}
        </InternalPanel>
      </div>
    </div>
  );
}
