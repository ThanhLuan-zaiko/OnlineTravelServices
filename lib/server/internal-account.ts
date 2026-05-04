import "server-only";

import { hash, verify, type Options as Argon2Options } from "@node-rs/argon2";

import { ADMINISTRATIVE_STAFF_ROLE, ACTIVE_STATUS } from "@/lib/server/auth-constants";
import { getCurrentAdministrativeStaff } from "@/lib/server/auth";
import { findUserById, findUserByPhone, normalizeApplied } from "@/lib/server/auth-data";
import { AuthError } from "@/lib/server/auth-errors";
import { executeQuery, getScyllaClient } from "@/lib/server/scylla";
import type {
  InternalAccountProfile,
  InternalAccountProfileRequest,
} from "@/lib/shared/internal";

const passwordHashOptions = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} satisfies Argon2Options;

type StaffByRoleRow = {
  department: string;
  email: string;
  full_name: string;
  last_activity_at: Date | null;
  role: string;
  staff_id: string;
  status: string;
  user_id: string;
};

type StaffByIdRow = {
  department: string;
  email: string;
  full_name: string;
  hired_at: Date;
  last_activity_at: Date | null;
  permissions: string[] | Set<string> | null;
  role: string;
  staff_id: string;
  staff_level: string;
  status: string;
  user_id: string;
};

function toPermissions(value: StaffByIdRow["permissions"]) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value.map(String) : [...value].map(String);
}

async function findStaffByUserId(userId: string) {
  const rows = await executeQuery<StaffByRoleRow>(
    `SELECT role, status, staff_id, user_id, email, full_name, department, last_activity_at
     FROM staff_by_role
     WHERE role = ? AND status = ?`,
    [ADMINISTRATIVE_STAFF_ROLE, ACTIVE_STATUS],
  );

  return rows.find((row) => String(row.user_id) === userId) ?? null;
}

async function findStaffDetailsById(staffId: string) {
  const rows = await executeQuery<StaffByIdRow>(
    `SELECT staff_id, user_id, email, full_name, role, department, status, staff_level, hired_at, last_activity_at, permissions
     FROM staff_by_id
     WHERE staff_id = ?`,
    [staffId],
  );

  return rows[0] ?? null;
}

function buildProfile(userId: string, user: NonNullable<Awaited<ReturnType<typeof findUserById>>>, details: StaffByIdRow): InternalAccountProfile {
  return {
    userId,
    email: user.email,
    fullName: details.full_name ?? user.full_name,
    role: ADMINISTRATIVE_STAFF_ROLE,
    customerTier: user.customer_tier ?? "standard",
    vipTier: user.vip_tier ?? "none",
    phone: user.phone ?? "",
    department: details.department,
    staffLevel: details.staff_level,
    hiredAt: details.hired_at.toISOString(),
    lastActivityAt: details.last_activity_at?.toISOString() ?? null,
    permissions: toPermissions(details.permissions),
  };
}

async function reserveStaffPhone(input: {
  createdAt: Date;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  status: string;
  userId: string;
}) {
  const result = await getScyllaClient().execute(
    `INSERT INTO users_by_phone
      (phone, user_id, email, full_name, role, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     IF NOT EXISTS`,
    [
      input.phone,
      input.userId,
      input.email,
      input.fullName,
      input.role,
      input.status,
      input.createdAt,
    ],
    { prepare: true },
  );

  return normalizeApplied(result.rows[0] as Record<string, unknown> | undefined);
}

export async function getCurrentAdministrativeStaffProfile(cookieValue: string | undefined) {
  const currentUser = await getCurrentAdministrativeStaff(cookieValue);

  if (!currentUser) {
    throw new AuthError("Vui lòng đăng nhập bằng tài khoản nhân sự hành chính.", 401);
  }

  const user = await findUserById(currentUser.userId);

  if (!user) {
    throw new AuthError("Phiên đăng nhập không hợp lệ.", 401);
  }

  const staff = await findStaffByUserId(currentUser.userId);

  if (!staff) {
    throw new AuthError("Không tìm thấy hồ sơ nhân sự.", 404);
  }

  const details = await findStaffDetailsById(staff.staff_id);

  if (!details) {
    throw new AuthError("Không tìm thấy thông tin nhân sự.", 404);
  }

  return buildProfile(currentUser.userId, user, details);
}

export async function updateCurrentAdministrativeStaffProfile(
  cookieValue: string | undefined,
  input: InternalAccountProfileRequest,
) {
  const currentUser = await getCurrentAdministrativeStaff(cookieValue);

  if (!currentUser) {
    throw new AuthError("Vui lòng đăng nhập bằng tài khoản nhân sự hành chính.", 401);
  }

  const user = await findUserById(currentUser.userId);

  if (!user) {
    throw new AuthError("Phiên đăng nhập không hợp lệ.", 401);
  }

  const staff = await findStaffByUserId(currentUser.userId);

  if (!staff) {
    throw new AuthError("Không tìm thấy hồ sơ nhân sự.", 404);
  }

  const details = await findStaffDetailsById(staff.staff_id);

  if (!details) {
    throw new AuthError("Không tìm thấy thông tin nhân sự.", 404);
  }

  const now = new Date();
  const previousPhone = user.phone ?? "";
  const phoneChanged = previousPhone !== input.phone;

  if (
    phoneChanged &&
    !(await reserveStaffPhone({
      createdAt: user.created_at ?? now,
      email: user.email,
      fullName: input.fullName,
      phone: input.phone,
      role: details.role,
      status: details.status,
      userId: currentUser.userId,
    }))
  ) {
    const existingPhoneUser = await findUserByPhone(input.phone);

    if (!existingPhoneUser || String(existingPhoneUser.user_id) !== currentUser.userId) {
      throw new AuthError("Số điện thoại đã được sử dụng.", 409, ["phone"]);
    }
  }

  if (input.newPassword) {
    const currentPasswordMatches = await verify(user.password_hash, input.currentPassword ?? "");

    if (!currentPasswordMatches) {
      throw new AuthError("Mật khẩu hiện tại không đúng.", 400, ["currentPassword"]);
    }

    const passwordHash = await hash(input.newPassword, passwordHashOptions);

    await executeQuery(
      "UPDATE users_by_id SET password_hash = ?, updated_at = ? WHERE user_id = ?",
      [passwordHash, now, currentUser.userId],
    );
    await executeQuery("UPDATE users_by_email SET password_hash = ? WHERE email = ?", [
      passwordHash,
      user.email,
    ]);
  }

  await executeQuery(
    "UPDATE users_by_id SET full_name = ?, phone = ?, updated_at = ? WHERE user_id = ?",
    [input.fullName, input.phone, now, currentUser.userId],
  );
  await executeQuery("UPDATE users_by_email SET full_name = ? WHERE email = ?", [input.fullName, user.email]);
  await executeQuery(
    "UPDATE users_by_role SET full_name = ?, phone = ? WHERE role = ? AND status = ? AND created_at = ? AND user_id = ?",
    [input.fullName, input.phone, details.role, details.status, user.created_at ?? now, currentUser.userId],
  );
  await executeQuery(
    "UPDATE staff_by_id SET email = ?, full_name = ?, role = ?, department = ?, status = ?, staff_level = ?, hired_at = ?, last_activity_at = ?, permissions = ? WHERE staff_id = ?",
    [
      user.email,
      input.fullName,
      details.role,
      details.department,
      details.status,
      details.staff_level,
      details.hired_at,
      now,
      details.permissions ?? [],
      details.staff_id,
    ],
  );
  await executeQuery(
    "UPDATE staff_by_role SET email = ?, full_name = ?, department = ?, last_activity_at = ? WHERE role = ? AND status = ? AND staff_id = ?",
    [user.email, input.fullName, details.department, now, details.role, details.status, details.staff_id],
  );

  if (phoneChanged && previousPhone) {
    await executeQuery("DELETE FROM users_by_phone WHERE phone = ?", [previousPhone]);
  }

  const updatedUser = await findUserById(currentUser.userId);
  const updatedStaff = await findStaffDetailsById(details.staff_id);

  if (!updatedUser || !updatedStaff) {
    throw new AuthError("Không thể tải lại hồ sơ sau khi cập nhật.", 500);
  }

  return buildProfile(currentUser.userId, updatedUser, updatedStaff);
}
