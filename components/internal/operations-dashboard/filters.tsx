import { FiRefreshCw } from "react-icons/fi";

import { InternalPanel } from "../internal-primitives";
import type { OperationsPeriodType } from "./types";

export function OperationsDashboardFilters({
  day,
  month,
  onDayChange,
  onMonthChange,
  onPeriodTypeChange,
  onRefresh,
  periodType,
}: {
  day: string;
  month: string;
  onDayChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onPeriodTypeChange: (value: OperationsPeriodType) => void;
  onRefresh: () => void;
  periodType: OperationsPeriodType;
}) {
  return (
    <InternalPanel className="p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="space-y-2">
          <span className="text-sm font-semibold">Ngày</span>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
            onChange={(event) => onDayChange(event.target.value)}
            type="date"
            value={day}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Tháng</span>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
            onChange={(event) => onMonthChange(event.target.value)}
            type="month"
            value={month}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Kỳ thống kê</span>
          <select
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
            onChange={(event) => onPeriodTypeChange(event.target.value as OperationsPeriodType)}
            value={periodType}
          >
            <option value="day">Ngày</option>
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
            <option value="year">Năm</option>
          </select>
        </label>
        <button
          className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200"
          onClick={onRefresh}
          type="button"
        >
          <FiRefreshCw size={16} />
          Làm mới
        </button>
      </div>
    </InternalPanel>
  );
}
