import { FiBell, FiSend } from "react-icons/fi";

import type { OperationCustomerNotification } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "../internal-primitives";
import type { OperationNotificationForm, OperationTour, SetState } from "./types";

export function NotificationSections({
  form,
  isHistoryLoading,
  isPending,
  notifications,
  onSubmit,
  selectedTour,
  setForm,
  showCompose,
  showHistory,
}: {
  form: OperationNotificationForm;
  isHistoryLoading: boolean;
  isPending: boolean;
  notifications: OperationCustomerNotification[];
  onSubmit: () => void;
  selectedTour: OperationTour | null;
  setForm: SetState<OperationNotificationForm>;
  showCompose: boolean;
  showHistory: boolean;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      {showCompose ? (
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiBell size={18} />
            <h2 className="text-base font-semibold">Thông báo khách hàng</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Loại cập nhật</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setForm((current) => ({ ...current, updateType: event.target.value }))}
                value={form.updateType}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Booking ID</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setForm((current) => ({ ...current, bookingId: event.target.value }))}
                value={form.bookingId}
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
                className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black"
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                value={form.body}
              />
            </label>
          </div>
          <button
            className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
            disabled={isPending || !selectedTour}
            onClick={onSubmit}
            type="button"
          >
            <FiSend size={16} />
            Gửi cập nhật
          </button>
        </InternalPanel>
      ) : null}

      {showHistory ? (
        <InternalPanel className="p-4">
          <h2 className="text-base font-semibold">Lịch sử thông báo</h2>
          <div className="mt-4 space-y-2">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800"
                  key={notification.notificationId}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">{notification.title}</p>
                    <StatusPill value={notification.deliveryStatus} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{notification.body}</p>
                </div>
              ))
            ) : (
              <EmptyState message={isHistoryLoading ? "Đang tải thông báo..." : "Chưa có thông báo cập nhật cho tour này."} />
            )}
          </div>
        </InternalPanel>
      ) : null}
    </div>
  );
}
