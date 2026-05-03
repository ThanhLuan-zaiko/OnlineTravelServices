import "server-only";

import { types } from "cassandra-driver";

import {
  ACTIVE_STATUS,
  CUSTOMER_ROLE,
  DEFAULT_CUSTOMER_TIER,
  DEFAULT_VIP_TIER,
} from "@/lib/server/auth-constants";
import { executeQuery, getScyllaClient } from "@/lib/server/scylla";
import type { AccountProfile, AuthUser } from "@/lib/shared/auth";

export type UserByEmailRow = {
  email: string;
  user_id: string;
  password_hash: string;
  full_name: string;
  role: string;
  status: string;
  customer_tier: string | null;
  vip_tier: string | null;
};

export type UserByIdRow = UserByEmailRow & {
  created_at: Date;
  phone: string | null;
  failed_login_count: number | null;
};

export type UserByPhoneRow = {
  phone: string;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  created_at: Date;
};

export type UserProfileRow = {
  full_name: string | null;
  gender: string | null;
  birth_date: types.LocalDate | string | null;
  address: string | null;
  nationality: string | null;
  passport_number: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

export type SessionRow = {
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
};

export function normalizeApplied(row: Record<string, unknown> | undefined) {
  return row?.["[applied]"] === true || row?.applied === true;
}

function localDateToString(value: types.LocalDate | string | null | undefined) {
  if (!value) {
    return null;
  }

  return String(value);
}

export function toAuthUser(row: UserByEmailRow | UserByIdRow): AuthUser {
  return {
    userId: String(row.user_id),
    email: row.email,
    fullName: row.full_name,
    role: "customer",
    customerTier: row.customer_tier ?? DEFAULT_CUSTOMER_TIER,
    vipTier: row.vip_tier ?? DEFAULT_VIP_TIER,
  };
}

export function toAccountProfile(user: UserByIdRow, profile: UserProfileRow | null): AccountProfile {
  return {
    userId: String(user.user_id),
    email: user.email,
    fullName: profile?.full_name ?? user.full_name,
    phone: user.phone ?? "",
    customerTier: user.customer_tier ?? DEFAULT_CUSTOMER_TIER,
    vipTier: user.vip_tier ?? DEFAULT_VIP_TIER,
    gender: profile?.gender ?? null,
    birthDate: localDateToString(profile?.birth_date),
    address: profile?.address ?? null,
    nationality: profile?.nationality ?? null,
    passportNumber: profile?.passport_number ?? null,
    emergencyContactName: profile?.emergency_contact_name ?? null,
    emergencyContactPhone: profile?.emergency_contact_phone ?? null,
  };
}

export async function findUserByEmail(email: string) {
  const rows = await executeQuery<UserByEmailRow>(
    `SELECT email, user_id, password_hash, full_name, role, status, customer_tier, vip_tier
     FROM users_by_email
     WHERE email = ?`,
    [email],
  );

  return rows[0] ?? null;
}

export async function findUserByPhone(phone: string) {
  const rows = await executeQuery<UserByPhoneRow>(
    `SELECT phone, user_id, email, full_name, role, status, created_at
     FROM users_by_phone
     WHERE phone = ?`,
    [phone],
  );

  return rows[0] ?? null;
}

export async function findUserById(userId: string) {
  const rows = await executeQuery<UserByIdRow>(
    `SELECT user_id, email, phone, password_hash, full_name, role, status, customer_tier, vip_tier, created_at, failed_login_count
     FROM users_by_id
     WHERE user_id = ?`,
    [userId],
  );

  return rows[0] ?? null;
}

export async function findProfileByUserId(userId: string) {
  const rows = await executeQuery<UserProfileRow>(
    `SELECT full_name, gender, birth_date, address, nationality, passport_number, emergency_contact_name, emergency_contact_phone
     FROM user_profile_by_id
     WHERE user_id = ?`,
    [userId],
  );

  return rows[0] ?? null;
}

export async function findSession(userId: string, sessionId: string) {
  const rows = await executeQuery<SessionRow>(
    `SELECT refresh_token_hash, expires_at, revoked_at
     FROM user_sessions
     WHERE user_id = ? AND session_id = ?`,
    [userId, sessionId],
  );

  return rows[0] ?? null;
}

export async function updateFailedLogin(userId: string) {
  const user = await findUserById(userId);
  const failedLoginCount = (user?.failed_login_count ?? 0) + 1;

  await executeQuery(
    "UPDATE users_by_id SET failed_login_count = ?, updated_at = ? WHERE user_id = ?",
    [failedLoginCount, new Date(), userId],
  );
}

export async function reservePhone(input: {
  createdAt: Date;
  email: string;
  fullName: string;
  phone: string;
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
      CUSTOMER_ROLE,
      ACTIVE_STATUS,
      input.createdAt,
    ],
    { prepare: true },
  );

  return normalizeApplied(result.rows[0] as Record<string, unknown> | undefined);
}

export async function reserveEmail(input: {
  createdAt: Date;
  email: string;
  fullName: string;
  passwordHash: string;
  userId: string;
}) {
  const result = await getScyllaClient().execute(
    `INSERT INTO users_by_email
      (email, user_id, password_hash, full_name, role, status, customer_tier, vip_tier, created_at, last_login_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     IF NOT EXISTS`,
    [
      input.email,
      input.userId,
      input.passwordHash,
      input.fullName,
      CUSTOMER_ROLE,
      ACTIVE_STATUS,
      DEFAULT_CUSTOMER_TIER,
      DEFAULT_VIP_TIER,
      input.createdAt,
      null,
    ],
    { prepare: true },
  );

  return normalizeApplied(result.rows[0] as Record<string, unknown> | undefined);
}
