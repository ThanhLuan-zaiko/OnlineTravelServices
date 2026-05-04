"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FiBarChart2, FiCreditCard, FiRefreshCw, FiTrendingUp } from "react-icons/fi";

import { getInternalRevenue } from "@/lib/client/api-client";

import { EmptyState, InternalPanel, InternalPageHeader } from "./internal-primitives";

function today() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function money(value: string) {
  return `${Number(value).toLocaleString("vi-VN")} đ`;
}

export function RevenueDashboard() {
  const [day, setDay] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const revenueQuery = useQuery({
    queryKey: ["internal", "revenue", day, month],
    queryFn: () => getInternalRevenue({ day, month }),
  });
  const revenue = revenueQuery.data?.revenue;
  const summary = revenue?.summary;
  const cards = [
    { icon: FiTrendingUp, label: "Tổng doanh thu", value: money(summary?.totalRevenue ?? "0") },
    { icon: FiBarChart2, label: "Doanh thu ròng", value: money(summary?.netRevenue ?? "0") },
    { icon: FiCreditCard, label: "Thanh toán", value: summary?.paymentCount ?? 0 },
    { icon: FiRefreshCw, label: "Hoàn tiền", value: money(summary?.refundAmount ?? "0") },
  ];

  return (
    <div className="space-y-5">
      <InternalPageHeader
        description="Theo dõi thống kê doanh thu từ các bảng aggregate theo ngày, tháng và hiệu suất tour."
        title="Quản lý doanh thu tour"
      />

      <InternalPanel className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Ngày</span>
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Tháng</span>
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
          </label>
        </div>
      </InternalPanel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <InternalPanel className="p-4" key={card.label}>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-200">
                <Icon size={18} />
              </span>
              <p className="mt-4 text-2xl font-semibold">{card.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-500 dark:text-neutral-400">{card.label}</p>
            </InternalPanel>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <InternalPanel className="p-4">
          <h3 className="mb-4 text-base font-semibold">Doanh thu ngày</h3>
          {revenue?.daily.length ? (
            <div className="space-y-2">
              {revenue.daily.map((row) => (
                <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={row.currency}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{row.currency}</p>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{money(row.netRevenue)}</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Tổng {money(row.totalRevenue)}, hoàn {money(row.refundAmount)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message={revenueQuery.isLoading ? "Đang tải doanh thu..." : "Chưa có dữ liệu doanh thu cho ngày này."} />
          )}
        </InternalPanel>

        <InternalPanel className="p-4">
          <h3 className="mb-4 text-base font-semibold">Hiệu suất tour theo tháng</h3>
          {revenue?.tourPerformance.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500 dark:text-neutral-500">
                  <tr>
                    <th className="px-3 py-3">Tour</th>
                    <th className="px-3 py-3">Doanh thu</th>
                    <th className="px-3 py-3">Booking</th>
                    <th className="px-3 py-3">Khách</th>
                    <th className="px-3 py-3">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
                  {revenue.tourPerformance.map((tour) => (
                    <tr key={tour.tourId}>
                      <td className="px-3 py-3 font-semibold">{tour.title}</td>
                      <td className="px-3 py-3 text-emerald-700 dark:text-emerald-300">{money(tour.revenue)}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">{tour.bookingCount}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">{tour.guestCount}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">{tour.averageRating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message={revenueQuery.isLoading ? "Đang tải hiệu suất..." : "Chưa có dữ liệu hiệu suất tháng này."} />
          )}
        </InternalPanel>
      </div>
    </div>
  );
}
