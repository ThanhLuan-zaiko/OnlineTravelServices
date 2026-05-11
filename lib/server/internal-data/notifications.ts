import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type { InternalStaffNotification } from "@/lib/shared/internal";

type NotificationRow = {
  body: string;
  entity_id: string | null;
  entity_label: string | null;
  entity_type: string | null;
  notification_id: string;
  notification_time: unknown;
  notification_type: string;
  read_at: Date | null;
  staff_id: string;
  title: string;
};

function toNotification(row: NotificationRow): InternalStaffNotification {
  return {
    body: row.body,
    entityId: row.entity_id ? String(row.entity_id) : null,
    entityLabel: row.entity_label,
    entityType: row.entity_type,
    notificationId: String(row.notification_id),
    notificationTime: String(row.notification_time),
    notificationType: row.notification_type,
    readAt: row.read_at ? row.read_at.toISOString() : null,
    staffId: String(row.staff_id),
    title: row.title,
  };
}

export async function createStaffNotification(input: {
  body: string;
  entityId?: string | null;
  entityLabel?: string | null;
  entityType?: string | null;
  notificationType: string;
  staffId: string;
  title: string;
}) {
  const notificationId = String(uuidv7());
  const notificationTime = String(types.TimeUuid.now());

  await executeQuery(
    `INSERT INTO notifications_by_staff
      (staff_id, notification_time, notification_id, notification_type, title, body, entity_type, entity_id, entity_label, read_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.staffId,
      notificationTime,
      notificationId,
      input.notificationType,
      input.title,
      input.body,
      input.entityType ?? null,
      input.entityId ?? null,
      input.entityLabel ?? null,
      null,
    ],
  );

  return notificationId;
}

export async function listStaffNotifications(
  staffId: string,
  options?: {
    cursor?: string | null;
    limit?: number;
    status?: "all" | "read" | "unread";
  },
) {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 80);
  const page = await executePagedQuery<NotificationRow>(
    `SELECT staff_id, notification_time, notification_id, notification_type, title, body, entity_type, entity_id, entity_label, read_at
     FROM notifications_by_staff
     WHERE staff_id = ?`,
    [staffId],
    {
      fetchSize: options?.status && options.status !== "all" ? Math.min(limit * 3, 120) : limit,
      pageState: options?.cursor ?? null,
    },
  );
  const status = options?.status ?? "all";
  const notifications = page.rows
    .map(toNotification)
    .filter((item) => {
      if (status === "read") return Boolean(item.readAt);
      if (status === "unread") return !item.readAt;
      return true;
    })
    .slice(0, limit);

  return {
    nextCursor: page.pageState ? String(page.pageState) : null,
    notifications,
  };
}

export async function markStaffNotificationRead(input: {
  notificationId: string;
  notificationTime: string;
  readAt?: Date;
  staffId: string;
}) {
  const readAt = input.readAt ?? new Date();

  await executeQuery(
    `UPDATE notifications_by_staff
     SET read_at = ?
     WHERE staff_id = ? AND notification_time = ? AND notification_id = ?`,
    [readAt, input.staffId, input.notificationTime, input.notificationId],
  );

  return readAt.toISOString();
}
