import { InternalPanel } from "../internal-primitives";
import { money } from "./formatters";
import type { OperationsDashboardData } from "./types";

export function StatisticsSections({
  operations,
  showPerformance,
  showVisits,
}: {
  operations: OperationsDashboardData;
  showPerformance: boolean;
  showVisits: boolean;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {showVisits ? (
        <InternalPanel className="p-4">
          <h2 className="text-base font-semibold">Thống kê khách và địa điểm</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-neutral-500">
                <tr>
                  <th className="px-3 py-3">Địa điểm</th>
                  <th className="px-3 py-3">Kỳ</th>
                  <th className="px-3 py-3">Khách ghé thăm</th>
                  <th className="px-3 py-3">Booking</th>
                  <th className="px-3 py-3">VIP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
                {(operations?.customerVisitStats ?? []).map((stat) => (
                  <tr key={`${stat.periodValue}-${stat.locationKey}`}>
                    <td className="px-3 py-3 font-semibold">{stat.locationKey}</td>
                    <td className="px-3 py-3">{stat.periodValue}</td>
                    <td className="px-3 py-3">{stat.visitorCount}</td>
                    <td className="px-3 py-3">{stat.bookingCount}</td>
                    <td className="px-3 py-3">{stat.vipCustomerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InternalPanel>
      ) : null}

      {showPerformance ? (
        <InternalPanel className="p-4">
          <h2 className="text-base font-semibold">Hiệu suất tour</h2>
          <div className="mt-4 space-y-2">
            {(operations?.revenue.tourPerformance ?? []).slice(0, 6).map((tour) => (
              <div
                className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-neutral-800 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                key={tour.tourId}
              >
                <p className="font-semibold">{tour.title}</p>
                <span>{money(tour.revenue)}</span>
                <span className="text-slate-500">{tour.bookingCount} booking</span>
              </div>
            ))}
          </div>
        </InternalPanel>
      ) : null}
    </div>
  );
}
