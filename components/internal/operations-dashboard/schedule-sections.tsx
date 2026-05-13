import { FiCalendar, FiSave } from "react-icons/fi";

import { EmptyState, InternalPanel, StatusPill } from "../internal-primitives";
import { money } from "./formatters";
import type { OperationSchedule, OperationSchedulePatch, OperationTour, SetState } from "./types";

export function ScheduleAdjustSection({
  isLoading,
  isPending,
  onSubmit,
  selectedSchedule,
  selectedTour,
  setSchedulePatch,
  setSelectedScheduleId,
  schedulePatch,
}: {
  isLoading: boolean;
  isPending: boolean;
  onSubmit: () => void;
  schedulePatch: OperationSchedulePatch;
  selectedSchedule: OperationSchedule | null;
  selectedTour: OperationTour | null;
  setSchedulePatch: SetState<OperationSchedulePatch>;
  setSelectedScheduleId: SetState<string>;
}) {
  return (
    <InternalPanel className="p-4">
      <div className="flex items-center gap-2">
        <FiCalendar size={18} />
        <h2 className="text-base font-semibold">Điều chỉnh lịch trình</h2>
      </div>
      {selectedTour && selectedTour.schedules.length > 0 ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Lịch khởi hành</span>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setSelectedScheduleId(event.target.value)}
                value={selectedSchedule?.scheduleId ?? ""}
              >
                {selectedTour.schedules.map((schedule) => (
                  <option key={schedule.scheduleId} value={schedule.scheduleId}>
                    {schedule.departureDate} - {schedule.departureTime}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Giờ mới</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setSchedulePatch((current) => ({ ...current, departureTime: event.target.value }))}
                placeholder={selectedSchedule?.departureTime}
                value={schedulePatch.departureTime}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Trạng thái</span>
              <select
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) =>
                  setSchedulePatch((current) => ({
                    ...current,
                    status: event.target.value as OperationSchedulePatch["status"],
                  }))
                }
                value={schedulePatch.status}
              >
                <option value="">Giữ nguyên</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Còn chỗ</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                min="0"
                onChange={(event) => setSchedulePatch((current) => ({ ...current, availableSlots: event.target.value }))}
                placeholder={String(selectedSchedule?.availableSlots ?? "")}
                type="number"
                value={schedulePatch.availableSlots}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Đã đặt</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                min="0"
                onChange={(event) => setSchedulePatch((current) => ({ ...current, bookedSlots: event.target.value }))}
                placeholder={String(selectedSchedule?.bookedSlots ?? "")}
                type="number"
                value={schedulePatch.bookedSlots}
              />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Giá tạm thời</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setSchedulePatch((current) => ({ ...current, price: event.target.value }))}
                placeholder={selectedSchedule?.price}
                value={schedulePatch.price}
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
            Lưu điều chỉnh
          </button>
        </>
      ) : (
        <EmptyState message={isLoading ? "Đang tải lịch trình..." : "Tour này chưa có lịch khởi hành."} />
      )}
    </InternalPanel>
  );
}

export function ScheduleCalendarSection({
  isLoading,
  onTourChange,
  selectedTour,
  tours,
}: {
  isLoading: boolean;
  onTourChange: (tourId: string) => void;
  selectedTour: OperationTour | null;
  tours: OperationTour[];
}) {
  return (
    <InternalPanel className="p-4">
      <div className="flex items-center gap-2">
        <FiCalendar size={18} />
        <h2 className="text-base font-semibold">Lịch hiện tại</h2>
      </div>
      <label className="mt-4 block space-y-2">
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
      <div className="mt-4 space-y-2">
        {selectedTour && selectedTour.schedules.length > 0 ? (
          selectedTour.schedules.map((schedule) => (
            <div
              className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-neutral-800 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
              key={schedule.scheduleId}
            >
              <p className="font-semibold">
                {schedule.departureDate} - {schedule.departureTime}
              </p>
              <StatusPill value={schedule.status} />
              <span>
                {schedule.bookedSlots}/{schedule.bookedSlots + schedule.availableSlots} khách
              </span>
              <span>{money(schedule.price)}</span>
            </div>
          ))
        ) : (
          <EmptyState message={isLoading ? "Đang tải lịch..." : "Tour này chưa có lịch khởi hành."} />
        )}
      </div>
    </InternalPanel>
  );
}
