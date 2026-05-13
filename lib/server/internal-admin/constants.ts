import "server-only";

import {
  OPERATIONS_ACCESS_PERMISSION,
  STAFF_MANAGE_PERMISSION,
  SYSTEM_MANAGE_PERMISSION,
} from "@/lib/server/auth-constants";
import { serverEnv } from "@/lib/server/env";
import type { AdminStaffRole } from "@/lib/shared/internal";

export const SCYLLA_CONTAINER_NAME = serverEnv.ADMIN_SCYLLA_CONTAINER_NAME;
export const KEYSPACE = serverEnv.SCYLLA_KEYSPACE;
export const BACKUP_ROOT = serverEnv.ADMIN_BACKUP_DIR;
export const CQL_REQUEST_TIMEOUT_SECONDS = serverEnv.ADMIN_CQL_REQUEST_TIMEOUT_SECONDS;

export const ADMINISTRATIVE_STAFF_PERMISSIONS = [
  "audit:read",
  "customer:manage",
  "notification:read",
  "suggested_tour:manage",
  "tour_approval:manage",
  "tour:manage",
  "schedule:manage",
  "promotion:manage",
  "revenue:read",
];

export const OPERATIONS_STATISTICS_STAFF_PERMISSIONS = [
  OPERATIONS_ACCESS_PERMISSION,
  "tour:read",
  "tour:update_status",
  "tour_info:update",
  "schedule:manage",
  "customer_stats:read",
  "customer_trend:analyze",
  "destination_stats:read",
  "revenue:read",
  "report:manage",
  "notification:manage",
  "notification:read",
  "audit:read",
];

export const SUPER_ADMIN_ONLY_PERMISSIONS = [
  STAFF_MANAGE_PERMISSION,
  SYSTEM_MANAGE_PERMISSION,
];

export const ADMIN_SUPER_STAFF_PERMISSIONS = Array.from(
  new Set([
    ...ADMINISTRATIVE_STAFF_PERMISSIONS,
    ...OPERATIONS_STATISTICS_STAFF_PERMISSIONS,
    ...SUPER_ADMIN_ONLY_PERMISSIONS,
  ]),
).sort();

export const ADMIN_PERMISSION_OPTIONS = Array.from(
  new Set([
    ...ADMINISTRATIVE_STAFF_PERMISSIONS,
    ...OPERATIONS_STATISTICS_STAFF_PERMISSIONS,
    ...SUPER_ADMIN_ONLY_PERMISSIONS,
  ]),
).sort();

export const ROLE_DEPARTMENTS: Record<AdminStaffRole, string> = {
  administrative_staff: "Administration",
  operations_statistics_staff: "Operations and Statistics",
};

export const DEFAULT_ROLE_PERMISSIONS: Record<AdminStaffRole, string[]> = {
  administrative_staff: ADMINISTRATIVE_STAFF_PERMISSIONS,
  operations_statistics_staff: OPERATIONS_STATISTICS_STAFF_PERMISSIONS,
};
