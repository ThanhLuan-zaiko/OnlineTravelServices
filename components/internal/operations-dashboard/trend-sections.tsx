import { FiSave, FiTrendingUp } from "react-icons/fi";

import { InternalPanel, StatusPill } from "../internal-primitives";
import { analysisLabels } from "./config";
import type { OperationsDashboardData, SetState, TrendForm } from "./types";

export function TrendSections({
  form,
  isPending,
  onSubmit,
  operations,
  setForm,
  showAnalysis,
  showSnapshots,
}: {
  form: TrendForm;
  isPending: boolean;
  onSubmit: () => void;
  operations: OperationsDashboardData;
  setForm: SetState<TrendForm>;
  showAnalysis: boolean;
  showSnapshots: boolean;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      {showAnalysis ? (
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiTrendingUp size={18} />
            <h2 className="text-base font-semibold">Phân tích xu hướng</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Loại phân tích</span>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setForm((current) => ({ ...current, analysisType: event.target.value as typeof current.analysisType }))}
                value={form.analysisType}
              >
                {Object.entries(analysisLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Kỳ dữ liệu</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setForm((current) => ({ ...current, inputPeriod: event.target.value }))}
                value={form.inputPeriod}
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Tiêu đề</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                value={form.title}
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Kết quả</span>
              <textarea
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setForm((current) => ({ ...current, resultSummary: event.target.value }))}
                value={form.resultSummary}
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input
                checked={form.positiveTrend}
                className="h-4 w-4"
                onChange={(event) => setForm((current) => ({ ...current, positiveTrend: event.target.checked }))}
                type="checkbox"
              />
              Xu hướng tích cực
            </label>
          </div>
          <button
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={isPending}
            onClick={onSubmit}
            type="button"
          >
            <FiSave size={16} />
            Lưu phân tích
          </button>
        </InternalPanel>
      ) : null}

      {showSnapshots ? (
        <InternalPanel className="p-4">
          <h2 className="text-base font-semibold">Ảnh chụp xu hướng</h2>
          <div className="mt-4 space-y-2">
            {(operations?.trendSnapshots ?? []).map((snapshot) => (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={snapshot.snapshotId}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{snapshot.title}</p>
                  <StatusPill value={snapshot.positiveTrend ? "positive" : "negative"} />
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{snapshot.resultSummary}</p>
              </div>
            ))}
          </div>
        </InternalPanel>
      ) : null}
    </div>
  );
}
