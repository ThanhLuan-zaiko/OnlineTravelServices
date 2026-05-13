import "server-only";

import {
  ACTIVE_STATUS,
  ADMINISTRATIVE_STAFF_ROLE,
  OPERATIONS_ACCESS_PERMISSION,
  STAFF_MANAGE_PERMISSION,
  SUPER_ADMIN_STAFF_LEVEL,
  SYSTEM_MANAGE_PERMISSION,
} from "@/lib/server/auth-constants";
import { AuthError } from "@/lib/server/auth-errors";
import { executeQuery } from "@/lib/server/scylla";
import type { AuthUser } from "@/lib/shared/auth";

export const SUPER_ADMIN_REQUIRED_PERMISSIONS = [
  STAFF_MANAGE_PERMISSION,
  SYSTEM_MANAGE_PERMISSION,
] as const;

type StaffByRoleRow = {
  staff_id: string;
  user_id: string;
};

type StaffByIdRow = {
  permissions: Set<string> | string[] | null;
  role: string;
  staff_id: string;
  staff_level: string;
  status: string;
  user_id: string;
};

export type StaffAccessDetails = AuthUser & {
  permissions: string[];
  staffId: string;
  staffLevel: string;
  status: string;
};

function toPermissions(value: StaffByIdRow["permissions"]) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value.map(String) : Array.from(value).map(String);
}

export function hasStaffPermissions(details: StaffAccessDetails, permissions: readonly string[]) {
  const owned = new Set(details.permissions);

  return permissions.every((permission) => owned.has(permission));
}

export function isSuperAdminStaff(details: StaffAccessDetails) {
  return (
    details.role === ADMINISTRATIVE_STAFF_ROLE &&
    details.staffLevel === SUPER_ADMIN_STAFF_LEVEL &&
    hasStaffPermissions(details, SUPER_ADMIN_REQUIRED_PERMISSIONS)
  );
}

export async function getStaffAccessDetails(user: AuthUser): Promise<StaffAccessDetails> {
  const staffRows = await executeQuery<StaffByRoleRow>(
    `SELECT staff_id, user_id
     FROM staff_by_role
     WHERE role = ? AND status = ?`,
    [user.role, ACTIVE_STATUS],
  );
  const staffRow = staffRows.find((row) => String(row.user_id) === user.userId);

  if (!staffRow) {
    throw new AuthError("Không tìm thấy hồ sơ nhân sự đang hoạt động.", 403);
  }

  const detailRows = await executeQuery<StaffByIdRow>(
    `SELECT staff_id, user_id, role, status, staff_level, permissions
     FROM staff_by_id
     WHERE staff_id = ?`,
    [String(staffRow.staff_id)],
  );
  const details = detailRows[0];

  if (
    !details ||
    String(details.user_id) !== user.userId ||
    details.role !== user.role ||
    details.status !== ACTIVE_STATUS
  ) {
    throw new AuthError("Hồ sơ nhân sự không hợp lệ hoặc đã bị khóa.", 403);
  }

  return {
    ...user,
    permissions: toPermissions(details.permissions),
    staffId: String(details.staff_id),
    staffLevel: details.staff_level,
    status: details.status,
  };
}

export async function assertStaffPermissions(
  user: AuthUser,
  permissions: readonly string[],
  message = "Bạn không có quyền truy cập chức năng này.",
) {
  const details = await getStaffAccessDetails(user);

  if (!hasStaffPermissions(details, permissions)) {
    throw new AuthError(message, 403);
  }

  return details;
}

export async function assertOperationsAccess(user: AuthUser) {
  return assertStaffPermissions(
    user,
    [OPERATIONS_ACCESS_PERMISSION],
    "Bạn không có quyền truy cập chức năng vận hành và thống kê.",
  );
}

export async function assertSuperAdminStaff(user: AuthUser) {
  const details = await getStaffAccessDetails(user);

  if (!isSuperAdminStaff(details)) {
    throw new AuthError("Chỉ Admin tổng mới có quyền truy cập chức năng cấp hệ thống.", 403);
  }

  return details;
}
