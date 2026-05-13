import { FiActivity, FiFileText, FiSave } from "react-icons/fi";

import type { OperationTourEvent } from "@/lib/shared/internal";

import { EmptyState, InternalPanel } from "../internal-primitives";
import { lifecycleLabels } from "./config";
import type { OperationTour, SetState, TourStatus } from "./types";

export function TourStatusSection({
  guestCount,
  isPending,
  onSubmit,
  onTourChange,
  selectedTour,
  setGuestCount,
  setStatusNote,
  setTourStatus,
  statusNote,
  tourStatus,
  tours,
}: {
  guestCount: string;
  isPending: boolean;
  onSubmit: () => void;
  onTourChange: (tourId: string) => void;
  selectedTour: OperationTour | null;
  setGuestCount: SetState<string>;
  setStatusNote: SetState<string>;
  setTourStatus: SetState<TourStatus>;
  statusNote: string;
  tourStatus: TourStatus;
  tours: OperationTour[];
}) {
  return (
    <InternalPanel className="p-4">
      <div className="flex items-center gap-2">
        <FiActivity size={18} />
        <h2 className="text-base font-semibold">Kiểm soát tour</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold">Tour</span>
          <select
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
            onChange={(event) => onTourChange(event.target.value)}
            value={selectedTour?.tourId ?? ""}
          >
            {tours.map((tour) => (
              <option key={tour.tourId} value={tour.tourId}>
                {tour.title}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Trạng thái</span>
          <select
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
            onChange={(event) => setTourStatus(event.target.value as TourStatus)}
            value={tourStatus}
          >
            {Object.entries(lifecycleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold">Số khách ghi nhận</span>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
            min="0"
            onChange={(event) => setGuestCount(event.target.value)}
            type="number"
            value={guestCount}
          />
        </label>
        <label className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold">Ghi chú</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black"
            onChange={(event) => setStatusNote(event.target.value)}
            value={statusNote}
          />
        </label>
      </div>
      <button
        className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
        disabled={isPending || !selectedTour}
        onClick={onSubmit}
        type="button"
      >
        <FiSave size={16} />
        Cập nhật trạng thái
      </button>
    </InternalPanel>
  );
}

export function TourEventsSection({
  events,
  isLoading,
}: {
  events: OperationTourEvent[];
  isLoading: boolean;
}) {
  return (
    <InternalPanel className="p-4">
      <div className="flex items-center gap-2">
        <FiFileText size={18} />
        <h2 className="text-base font-semibold">Lịch sử trạng thái vận hành</h2>
      </div>
      <div className="mt-4 space-y-2">
        {events.length > 0 ? (
          events.map((event) => (
            <div
              className="rounded-xl border border-slate-200 p-3 text-sm dark:border-neutral-800"
              key={event.eventId}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{event.tourTitle}</p>
                <span className="text-xs text-slate-500">{lifecycleLabels[event.status]}</span>
              </div>
              <p className="mt-1 text-slate-500 dark:text-neutral-400">{event.note ?? "Không có ghi chú"}</p>
            </div>
          ))
        ) : (
          <EmptyState message={isLoading ? "Đang tải lịch sử..." : "Chưa có sự kiện vận hành nào."} />
        )}
      </div>
    </InternalPanel>
  );
}
