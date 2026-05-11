"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { FiBell, FiCheck, FiExternalLink } from "react-icons/fi";

import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  getInternalNotifications,
  markInternalNotificationRead,
  type ApiError,
} from "@/lib/client/api-client";
import type { InternalStaffNotification } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

const statusOptions = [
  { label: "all", value: "all" },
  { label: "unread", value: "unread" },
  { label: "read", value: "read" },
];

function entityHref(notification: InternalStaffNotification) {
  if (notification.entityType === "suggested_tour") return "/internal/suggested-tours";
  if (notification.entityType === "tour_approval") return "/internal/tour-approvals";
  if (notification.entityType === "customer") return "/internal/customers";
  if (notification.entityType === "promotion") return "/internal/promotions";
  if (notification.entityType === "tour") return "/internal/tours";
  return null;
}

export function NotificationManager() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [status, setStatus] = useState<"all" | "read" | "unread">("all");
  const notificationsQuery = useQuery({
    queryKey: ["internal", "notifications", status] as const,
    queryFn: () => getInternalNotifications({ limit: 40, status }),
  });
  const readMutation = useMutation({
    mutationFn: (notification: InternalStaffNotification) => markInternalNotificationRead(notification),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "notifications"] });
      showToast({ title: "Đã đánh dấu đọc", message: "Thông báo đã được cập nhật.", variant: "success" });
    },
    onError: (error) => showToast({ title: "Không thể cập nhật", message: (error as ApiError).message, variant: "error" }),
  });
  const notifications = notificationsQuery.data?.notifications ?? [];

  return (
    <div className="space-y-5">
      <InternalPageHeader
        description="Theo dõi thông báo nội bộ liên quan đến tour đề xuất, phê duyệt, khách hàng và thao tác vận hành."
        title="Thông báo"
      />
      <InternalPanel className="p-4">
        <div className="max-w-xs">
          <SelectField label="Trạng thái" name="notification-status" onValueChange={(value) => setStatus(value as typeof status)} options={statusOptions} placeholder="Trạng thái" value={status} />
        </div>
        <div className="mt-4 space-y-3">
          {notifications.length === 0 ? (
            <EmptyState message={notificationsQuery.isLoading ? "Đang tải thông báo..." : "Không có thông báo phù hợp."} />
          ) : (
            notifications.map((notification) => {
              const href = entityHref(notification);

              return (
                <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-black" key={notification.notificationId}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 dark:border-neutral-800">
                        <FiBell size={17} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold">{notification.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{notification.body}</p>
                        {notification.entityLabel ? <p className="mt-1 text-xs text-slate-400">{notification.entityLabel}</p> : null}
                      </div>
                    </div>
                    <StatusPill value={notification.readAt ? "read" : "unread"} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!notification.readAt ? (
                      <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-neutral-800" onClick={() => readMutation.mutate(notification)} type="button">
                        <FiCheck size={14} />
                        Đã đọc
                      </button>
                    ) : null}
                    {href ? (
                      <Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-neutral-800" href={href}>
                        <FiExternalLink size={14} />
                        Mở liên kết
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </InternalPanel>
    </div>
  );
}
