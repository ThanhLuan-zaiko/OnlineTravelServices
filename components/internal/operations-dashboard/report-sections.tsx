import { FiDownload, FiFileText, FiSave } from "react-icons/fi";

import type { OperationReport } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "../internal-primitives";
import type { ReportForm, SetState } from "./types";

export function ReportSections({
  form,
  isListLoading,
  isPending,
  onDownload,
  onSubmit,
  reports,
  setForm,
  showEditor,
  showList,
}: {
  form: ReportForm;
  isListLoading: boolean;
  isPending: boolean;
  onDownload: () => void;
  onSubmit: () => void;
  reports: OperationReport[];
  setForm: SetState<ReportForm>;
  showEditor: boolean;
  showList: boolean;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      {showEditor ? (
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiFileText size={18} />
            <h2 className="text-base font-semibold">Báo cáo</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Kỳ</span>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setForm((current) => ({ ...current, periodType: event.target.value as typeof current.periodType }))}
                value={form.periodType}
              >
                <option value="day">Ngày</option>
                <option value="week">Tuần</option>
                <option value="month">Tháng</option>
                <option value="year">Năm</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Giá trị kỳ</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setForm((current) => ({ ...current, periodValue: event.target.value }))}
                value={form.periodValue}
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
              <span className="text-sm font-semibold">Nội dung</span>
              <textarea
                className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                value={form.content}
              />
            </label>
          </div>
          <button
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={isPending}
            onClick={onSubmit}
            type="button"
          >
            <FiSave size={16} />
            Lưu báo cáo
          </button>
        </InternalPanel>
      ) : null}

      {showList ? (
        <InternalPanel className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Báo cáo đã lưu</h2>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold dark:border-neutral-800"
              onClick={onDownload}
              type="button"
            >
              <FiDownload size={16} />
              CSV
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {reports.length > 0 ? (
              reports.map((report) => (
                <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={report.reportId}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">{report.title}</p>
                    <StatusPill value={report.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-neutral-400">{report.content}</p>
                </div>
              ))
            ) : (
              <EmptyState message={isListLoading ? "Đang tải báo cáo..." : "Chưa có báo cáo cho kỳ này."} />
            )}
          </div>
        </InternalPanel>
      ) : null}
    </div>
  );
}
