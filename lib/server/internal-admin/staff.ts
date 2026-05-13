import "server-only";

import { hash, type Options as Argon2Options } from "@node-rs/argon2";
import { uuidv7 } from "uuidv7";

import { AuthError } from "@/lib/server/auth";
import { ACTIVE_STATUS, SUPER_ADMIN_STAFF_LEVEL } from "@/lib/server/auth-constants";
import { writeInternalAuditEvent } from "@/lib/server/internal-data/audit";
import { executeBatch, executeQuery } from "@/lib/server/scylla";
import type { AuthUser } from "@/lib/shared/auth";
import type {
  AdminStaffAccount,
  AdminStaffCreateRequest,
  AdminStaffRole,
  AdminStaffStatus,
  AdminStaffUpdateRequest,
} from "@/lib/shared/internal";

import { DEFAULT_ROLE_PERMISSIONS, ROLE_DEPARTMENTS, SUPER_ADMIN_ONLY_PERMISSIONS } from "./constants";

const passwordHashOptions = {
  algorithm: 2,
  memoryCost: 19_456,
  outputLen: 32,
  parallelism: 1,
  timeCost: 2,
} satisfies Argon2Options;

type StaffByIdRow = {
  department: string;
  email: string;
  full_name: string;
  hired_at: Date | string;
  last_activity_at: Date | string | null;
  permissions: Set<string> | string[] | null;
  role: AdminStaffRole;
  staff_id: string;
  staff_level: string;
  status: AdminStaffStatus;
  user_id: string;
};

type StaffByRoleRow = {
  staff_id: string;
};

type UserByIdRow = {
  created_at: Date | string | null;
  email: string;
  full_name: string;
  phone: string;
  role: AdminStaffRole;
  status: AdminStaffStatus;
  user_id: string;
};

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : String(value);
}

function toPermissions(value: StaffByIdRow["permissions"]) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : Array.from(value);
}

function toStaffAccount(row: StaffByIdRow, user?: UserByIdRow | null): AdminStaffAccount {
  return {
    department: row.department,
    email: row.email,
    fullName: row.full_name,
    hiredAt: toIso(row.hired_at) ?? "",
    lastActivityAt: toIso(row.last_activity_at),
    permissions: toPermissions(row.permissions),
    phone: user?.phone ?? "",
    role: row.role,
    staffId: String(row.staff_id),
    staffLevel: row.staff_level,
    status: row.status,
    userId: String(row.user_id),
  };
}

function defaultPermissions(role: AdminStaffRole, permissions?: string[]) {
  return permissions?.length ? permissions : DEFAULT_ROLE_PERMISSIONS[role];
}

function hasSuperAdminOnlyPermission(permissions: string[]) {
  const superOnlyPermissions = new Set(SUPER_ADMIN_ONLY_PERMISSIONS);

  return permissions.some((permission) => superOnlyPermissions.has(permission));
}

function assertNoSuperAdminGrant(input: { permissions: string[]; staffLevel: string }) {
  if (input.staffLevel === SUPER_ADMIN_STAFF_LEVEL || hasSuperAdminOnlyPermission(input.permissions)) {
    throw new AuthError(
      "Không thể cấp quyền Admin tổng hoặc quyền cấp hệ thống từ API quản lý nhân viên. Hãy dùng seed Admin tổng riêng.",
      403,
    );
  }
}

function assertNotSeededSuperAdmin(staff: AdminStaffAccount) {
  if (
    staff.staffLevel === SUPER_ADMIN_STAFF_LEVEL ||
    hasSuperAdminOnlyPermission(staff.permissions)
  ) {
    throw new AuthError("Không thể sửa hoặc xóa tài khoản Admin tổng được tạo bằng seed riêng.", 403);
  }
}

async function findUserByEmail(email: string) {
  const rows = await executeQuery<{ role: string; user_id: string }>(
    "SELECT user_id, role FROM users_by_email WHERE email = ?",
    [email],
  );

  return rows[0] ?? null;
}

async function findUserByPhone(phone: string) {
  const rows = await executeQuery<{ user_id: string }>(
    "SELECT user_id FROM users_by_phone WHERE phone = ?",
    [phone],
  );

  return rows[0] ?? null;
}

async function findUserById(userId: string) {
  const rows = await executeQuery<UserByIdRow>(
    "SELECT user_id, email, phone, full_name, role, status, created_at FROM users_by_id WHERE user_id = ?",
    [userId],
  );

  return rows[0] ?? null;
}

export async function getAdminStaff(staffId: string) {
  const rows = await executeQuery<StaffByIdRow>(
    `SELECT staff_id, user_id, email, full_name, role, department, status, staff_level, hired_at, last_activity_at, permissions
     FROM staff_by_id
     WHERE staff_id = ?`,
    [staffId],
  );
  const staff = rows[0];

  if (!staff) {
    return null;
  }

  return toStaffAccount(staff, await findUserById(String(staff.user_id)));
}

export async function listAdminStaff(input?: {
  role?: AdminStaffRole | "all";
  status?: AdminStaffStatus | "all";
}) {
  const roles =
    input?.role && input.role !== "all"
      ? [input.role]
      : (["administrative_staff", "operations_statistics_staff"] as AdminStaffRole[]);
  const statuses =
    input?.status && input.status !== "all"
      ? [input.status]
      : (["active", "inactive", "suspended"] as AdminStaffStatus[]);
  const staffRows: StaffByRoleRow[] = [];

  for (const role of roles) {
    for (const status of statuses) {
      staffRows.push(
        ...(await executeQuery<StaffByRoleRow>(
          `SELECT staff_id
           FROM staff_by_role
           WHERE role = ? AND status = ?`,
          [role, status],
        )),
      );
    }
  }

  const staff = await Promise.all(staffRows.map((row) => getAdminStaff(String(row.staff_id))));

  return staff.filter((item): item is AdminStaffAccount => Boolean(item));
}

export async function createAdminStaff(input: AdminStaffCreateRequest, actor: AuthUser, request?: Request) {
  const role = input.role;
  const now = new Date();
  const userId = String(uuidv7());
  const staffId = String(uuidv7());

  assertNoSuperAdminGrant(input);

  if (await findUserByEmail(input.email)) {
    throw new AuthError("Email đã được sử dụng.", 409, ["email"]);
  }

  if (await findUserByPhone(input.phone)) {
    throw new AuthError("Số điện thoại đã được sử dụng.", 409, ["phone"]);
  }

  const passwordHash = await hash(input.password, passwordHashOptions);
  const department = input.department || ROLE_DEPARTMENTS[role];
  const permissions = defaultPermissions(role, input.permissions);

  await executeBatch([
    {
      query: `INSERT INTO users_by_id
        (user_id, email, phone, password_hash, full_name, role, status, customer_tier, vip_tier,
         created_at, updated_at, last_login_at, failed_login_count, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [userId, input.email, input.phone, passwordHash, input.fullName, role, ACTIVE_STATUS, null, null, now, now, null, 0, { created_by: actor.userId, source: "admin_ui" }],
    },
    {
      query: `INSERT INTO users_by_email
        (email, user_id, password_hash, full_name, role, status, customer_tier, vip_tier, created_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [input.email, userId, passwordHash, input.fullName, role, ACTIVE_STATUS, null, null, now, null],
    },
    {
      query: `INSERT INTO users_by_phone
        (phone, user_id, email, full_name, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [input.phone, userId, input.email, input.fullName, role, ACTIVE_STATUS, now],
    },
    {
      query: `INSERT INTO users_by_role
        (role, status, created_at, user_id, email, full_name, phone)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [role, ACTIVE_STATUS, now, userId, input.email, input.fullName, input.phone],
    },
    {
      query: `INSERT INTO staff_by_id
        (staff_id, user_id, email, full_name, role, department, status, staff_level, hired_at, last_activity_at, permissions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [staffId, userId, input.email, input.fullName, role, department, ACTIVE_STATUS, input.staffLevel, now, null, permissions],
    },
    {
      query: `INSERT INTO staff_by_role
        (role, status, staff_id, user_id, email, full_name, department, last_activity_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [role, ACTIVE_STATUS, staffId, userId, input.email, input.fullName, department, null],
    },
  ]);

  await writeInternalAuditEvent({
    action: "admin_staff_created",
    actor,
    description: `Tạo nhân viên nội bộ ${input.email}.`,
    entityId: staffId,
    entityType: "staff",
    request,
  });

  return getAdminStaff(staffId);
}

export async function updateAdminStaff(staffId: string, input: AdminStaffUpdateRequest, actor: AuthUser, request?: Request) {
  const current = await getAdminStaff(staffId);

  if (!current) {
    throw new AuthError("Không tìm thấy nhân viên.", 404);
  }

  assertNotSeededSuperAdmin(current);
  assertNoSuperAdminGrant(input);

  const user = await findUserById(current.userId);

  if (!user?.created_at) {
    throw new AuthError("Không thể tải dữ liệu tài khoản nhân viên.", 500);
  }

  const now = new Date();
  const roleChanged = current.role !== input.role;
  const statusChanged = current.status !== input.status;

  await executeBatch([
    {
      query: "UPDATE users_by_id SET full_name = ?, role = ?, status = ?, updated_at = ? WHERE user_id = ?",
      params: [input.fullName, input.role, input.status, now, current.userId],
    },
    {
      query: "UPDATE users_by_email SET full_name = ?, role = ?, status = ? WHERE email = ?",
      params: [input.fullName, input.role, input.status, current.email],
    },
    {
      query: "UPDATE users_by_phone SET full_name = ?, role = ?, status = ? WHERE phone = ?",
      params: [input.fullName, input.role, input.status, current.phone],
    },
    {
      query: "UPDATE staff_by_id SET full_name = ?, role = ?, department = ?, status = ?, staff_level = ?, permissions = ? WHERE staff_id = ?",
      params: [input.fullName, input.role, input.department, input.status, input.staffLevel, input.permissions, staffId],
    },
  ]);

  if (roleChanged || statusChanged) {
    await executeBatch([
      {
        query: "DELETE FROM staff_by_role WHERE role = ? AND status = ? AND staff_id = ?",
        params: [current.role, current.status, staffId],
      },
      {
        query: `INSERT INTO staff_by_role
          (role, status, staff_id, user_id, email, full_name, department, last_activity_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [input.role, input.status, staffId, current.userId, current.email, input.fullName, input.department, current.lastActivityAt],
      },
      {
        query: "DELETE FROM users_by_role WHERE role = ? AND status = ? AND created_at = ? AND user_id = ?",
        params: [current.role, current.status, user.created_at, current.userId],
      },
      {
        query: `INSERT INTO users_by_role
          (role, status, created_at, user_id, email, full_name, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        params: [input.role, input.status, user.created_at, current.userId, current.email, input.fullName, current.phone],
      },
    ]);
  } else {
    await executeBatch([
      {
        query: "UPDATE staff_by_role SET email = ?, full_name = ?, department = ?, last_activity_at = ? WHERE role = ? AND status = ? AND staff_id = ?",
        params: [current.email, input.fullName, input.department, current.lastActivityAt, input.role, input.status, staffId],
      },
      {
        query: "UPDATE users_by_role SET full_name = ?, phone = ? WHERE role = ? AND status = ? AND created_at = ? AND user_id = ?",
        params: [input.fullName, current.phone, input.role, input.status, user.created_at, current.userId],
      },
    ]);
  }

  await writeInternalAuditEvent({
    action: "admin_staff_updated",
    actor,
    description: `Cập nhật nhân viên nội bộ ${current.email}.`,
    entityId: staffId,
    entityType: "staff",
    request,
  });

  return getAdminStaff(staffId);
}

export async function hardDeleteAdminStaff(staffId: string, actor: AuthUser, request?: Request) {
  const current = await getAdminStaff(staffId);

  if (!current) {
    throw new AuthError("Không tìm thấy nhân viên.", 404);
  }

  assertNotSeededSuperAdmin(current);

  if (current.userId === actor.userId) {
    throw new AuthError("Admin không thể xóa chính tài khoản đang đăng nhập.", 400);
  }

  const user = await findUserById(current.userId);

  await executeBatch([
    { query: "DELETE FROM staff_by_id WHERE staff_id = ?", params: [staffId] },
    { query: "DELETE FROM staff_by_role WHERE role = ? AND status = ? AND staff_id = ?", params: [current.role, current.status, staffId] },
    { query: "DELETE FROM users_by_id WHERE user_id = ?", params: [current.userId] },
    { query: "DELETE FROM users_by_email WHERE email = ?", params: [current.email] },
    { query: "DELETE FROM users_by_phone WHERE phone = ?", params: [current.phone] },
    ...(user?.created_at
      ? [
          {
            query: "DELETE FROM users_by_role WHERE role = ? AND status = ? AND created_at = ? AND user_id = ?",
            params: [current.role, current.status, user.created_at, current.userId],
          },
        ]
      : []),
  ]);

  await writeInternalAuditEvent({
    action: "admin_staff_hard_deleted",
    actor,
    description: `Xóa cứng nhân viên nội bộ ${current.email}.`,
    entityId: staffId,
    entityType: "staff",
    request,
  });
}
