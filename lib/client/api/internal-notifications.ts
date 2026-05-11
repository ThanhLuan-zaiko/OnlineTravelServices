import type { InternalStaffNotification } from "@/lib/shared/internal";

import { apiClient } from "./core";

export async function getInternalNotifications(input?: {
  cursor?: string | null;
  limit?: number;
  status?: "all" | "read" | "unread";
}) {
  const response = await apiClient.get<{ nextCursor: string | null; notifications: InternalStaffNotification[] }>(
    "/internal/notifications",
    {
      params: {
        cursor: input?.cursor ?? undefined,
        limit: input?.limit,
        status: input?.status,
      },
    },
  );

  return response.data;
}

export async function markInternalNotificationRead(notification: InternalStaffNotification) {
  const response = await apiClient.patch<{ readAt: string }>(
    `/internal/notifications/${notification.notificationId}/read`,
    {
      notificationTime: notification.notificationTime,
    },
  );

  return response.data;
}
