import "server-only";

import { hash, verify, type Options as Argon2Options } from "@node-rs/argon2";
import { types } from "cassandra-driver";
import { randomBytes } from "node:crypto";
import { uuidv7 } from "uuidv7";

import { writeSecurityEvent } from "@/lib/server/auth-audit";
import {
  ACTIVE_STATUS,
  CUSTOMER_ROLE,
  DEFAULT_CUSTOMER_TIER,
  DEFAULT_VIP_TIER,
  DUMMY_PASSWORD_HASH,
  DUPLICATE_ACCOUNT_ERROR,
  FAILED_AUTH_DELAY_MS,
  GENERIC_LOGIN_ERROR,
  SESSION_TTL_DAYS,
} from "@/lib/server/auth-constants";
import {
  hashSessionToken,
  parseSessionCookie,
  safeEqual,
  serializeSessionCookie,
} from "@/lib/server/auth-cookie";
import {
  findProfileByUserId,
  findSession,
  findUserByEmail,
  findUserById,
  findUserByPhone,
  reserveEmail,
  reservePhone,
  toAccountProfile,
  toAuthUser,
  updateFailedLogin,
} from "@/lib/server/auth-data";
import { AuthError, type AuthErrorField } from "@/lib/server/auth-errors";
import { executeQuery } from "@/lib/server/scylla";
import type { AccountProfileRequest, LoginRequest, RegisterRequest } from "@/lib/shared/auth";

const passwordHashOptions = {
  algorithm: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} satisfies Argon2Options;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function delayFailedAuth() {
  return new Promise((resolve) => {
    setTimeout(resolve, FAILED_AUTH_DELAY_MS);
  });
}

function throwDuplicateAccount(fields: AuthErrorField[]) {
  throw new AuthError(DUPLICATE_ACCOUNT_ERROR, 409, fields);
}

async function createSession(userId: string, request: Request) {
  const sessionId = uuidv7();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = addDays(now, SESSION_TTL_DAYS);

  await executeQuery(
    `INSERT INTO user_sessions
      (user_id, session_id, refresh_token_hash, device_label, ip_address, user_agent, created_at, expires_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      sessionId,
      hashSessionToken(token),
      "Web browser",
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        request.headers.get("x-real-ip") ??
        null,
      request.headers.get("user-agent")?.slice(0, 512) ?? null,
      now,
      expiresAt,
      null,
    ],
  );

  return {
    cookieValue: serializeSessionCookie({
      userId,
      sessionId,
      token,
      expiresAt: expiresAt.toISOString(),
    }),
    expiresAt,
  };
}

export async function registerCustomer(input: RegisterRequest, request: Request) {
  const [existingEmail, existingPhone] = await Promise.all([
    findUserByEmail(input.email),
    findUserByPhone(input.phone),
  ]);
  const duplicateFields: AuthErrorField[] = [];

  if (existingEmail) {
    duplicateFields.push("email");
  }

  if (existingPhone) {
    duplicateFields.push("phone");
  }

  if (duplicateFields.length > 0) {
    throwDuplicateAccount(duplicateFields);
  }

  const now = new Date();
  const userId = uuidv7();
  const passwordHash = await hash(input.password, passwordHashOptions);

  if (
    !(await reservePhone({
      createdAt: now,
      email: input.email,
      fullName: input.fullName,
      phone: input.phone,
      userId,
    }))
  ) {
    throwDuplicateAccount(["phone"]);
  }

  if (
    !(await reserveEmail({
      createdAt: now,
      email: input.email,
      fullName: input.fullName,
      passwordHash,
      userId,
    }))
  ) {
    await executeQuery("DELETE FROM users_by_phone WHERE phone = ?", [input.phone]);
    throwDuplicateAccount(["email"]);
  }

  await executeQuery(
    `INSERT INTO users_by_id
      (user_id, email, phone, password_hash, full_name, role, status, customer_tier, vip_tier, created_at, updated_at, last_login_at, failed_login_count, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.email,
      input.phone,
      passwordHash,
      input.fullName,
      CUSTOMER_ROLE,
      ACTIVE_STATUS,
      DEFAULT_CUSTOMER_TIER,
      DEFAULT_VIP_TIER,
      now,
      now,
      null,
      0,
      {},
    ],
  );

  await executeQuery(
    `INSERT INTO users_by_role
      (role, status, created_at, user_id, email, full_name, phone)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [CUSTOMER_ROLE, ACTIVE_STATUS, now, userId, input.email, input.fullName, input.phone],
  );

  await executeQuery(
    `INSERT INTO customers_by_id
      (user_id, email, full_name, phone, customer_tier, vip_tier, loyalty_points, total_bookings, total_spent, violation_count, last_booking_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.email,
      input.fullName,
      input.phone,
      DEFAULT_CUSTOMER_TIER,
      DEFAULT_VIP_TIER,
      0,
      0,
      types.BigDecimal.fromString("0"),
      0,
      null,
      now,
    ],
  );

  await executeQuery(
    `INSERT INTO user_profile_by_id
      (user_id, full_name, gender, birth_date, avatar_url, address, nationality, passport_number, emergency_contact_name, emergency_contact_phone, preferences, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      input.fullName,
      input.gender ?? null,
      input.birthDate ? types.LocalDate.fromString(input.birthDate) : null,
      null,
      input.address ?? null,
      input.nationality ?? null,
      input.passportNumber ?? null,
      input.emergencyContactName ?? null,
      input.emergencyContactPhone ?? null,
      {},
      now,
    ],
  );

  await writeSecurityEvent(userId, "customer_registered", request, "low", "Customer account created.");

  return toAuthUser({
    email: input.email,
    user_id: userId,
    password_hash: passwordHash,
    full_name: input.fullName,
    role: CUSTOMER_ROLE,
    status: ACTIVE_STATUS,
    customer_tier: DEFAULT_CUSTOMER_TIER,
    vip_tier: DEFAULT_VIP_TIER,
  });
}

export async function loginCustomer(input: LoginRequest, request: Request) {
  const user = await findUserByEmail(input.email);

  if (!user) {
    await verify(DUMMY_PASSWORD_HASH, input.password);
    await delayFailedAuth();
    throw new AuthError(GENERIC_LOGIN_ERROR, 401);
  }

  if (user.role !== CUSTOMER_ROLE || user.status !== ACTIVE_STATUS) {
    await writeSecurityEvent(
      String(user.user_id),
      "customer_login_blocked",
      request,
      "medium",
      "Login blocked because role or status is not allowed.",
    );
    throw new AuthError(GENERIC_LOGIN_ERROR, 401);
  }

  const passwordMatches = await verify(user.password_hash, input.password);

  if (!passwordMatches) {
    await updateFailedLogin(String(user.user_id));
    await writeSecurityEvent(
      String(user.user_id),
      "customer_login_failed",
      request,
      "medium",
      "Invalid password.",
    );
    await delayFailedAuth();
    throw new AuthError(GENERIC_LOGIN_ERROR, 401);
  }

  const now = new Date();

  await executeQuery(
    "UPDATE users_by_id SET last_login_at = ?, failed_login_count = ?, updated_at = ? WHERE user_id = ?",
    [now, 0, now, String(user.user_id)],
  );
  await executeQuery("UPDATE users_by_email SET last_login_at = ? WHERE email = ?", [
    now,
    user.email,
  ]);
  await writeSecurityEvent(String(user.user_id), "customer_login_success", request, "low", "Login succeeded.");

  return {
    user: toAuthUser(user),
    session: await createSession(String(user.user_id), request),
  };
}

export async function logoutCustomer(cookieValue: string | undefined) {
  const payload = parseSessionCookie(cookieValue);

  if (!payload) {
    return;
  }

  await executeQuery(
    "UPDATE user_sessions SET revoked_at = ? WHERE user_id = ? AND session_id = ?",
    [new Date(), payload.userId, payload.sessionId],
  );
}

export async function getCurrentCustomer(cookieValue: string | undefined) {
  const payload = parseSessionCookie(cookieValue);

  if (!payload || new Date(payload.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const session = await findSession(payload.userId, payload.sessionId);

  if (
    !session ||
    session.revoked_at ||
    session.expires_at.getTime() <= Date.now() ||
    !safeEqual(session.refresh_token_hash, hashSessionToken(payload.token))
  ) {
    return null;
  }

  const user = await findUserById(payload.userId);

  if (!user || user.role !== CUSTOMER_ROLE || user.status !== ACTIVE_STATUS) {
    return null;
  }

  return toAuthUser(user);
}

export async function getCurrentCustomerProfile(cookieValue: string | undefined) {
  const currentUser = await getCurrentCustomer(cookieValue);

  if (!currentUser) {
    throw new AuthError("Vui lòng đăng nhập để tiếp tục.", 401);
  }

  const user = await findUserById(currentUser.userId);

  if (!user) {
    throw new AuthError("Phiên đăng nhập không hợp lệ.", 401);
  }

  return toAccountProfile(user, await findProfileByUserId(currentUser.userId));
}

export async function updateCurrentCustomerProfile(
  cookieValue: string | undefined,
  input: AccountProfileRequest,
) {
  const currentUser = await getCurrentCustomer(cookieValue);

  if (!currentUser) {
    throw new AuthError("Vui lòng đăng nhập để tiếp tục.", 401);
  }

  const user = await findUserById(currentUser.userId);

  if (!user) {
    throw new AuthError("Phiên đăng nhập không hợp lệ.", 401);
  }

  const now = new Date();
  const previousPhone = user.phone ?? "";
  const phoneChanged = previousPhone !== input.phone;

  if (
    phoneChanged &&
    !(await reservePhone({
      createdAt: user.created_at ?? now,
      email: user.email,
      fullName: input.fullName,
      phone: input.phone,
      userId: currentUser.userId,
    }))
  ) {
    const existingPhoneUser = await findUserByPhone(input.phone);

    if (!existingPhoneUser || String(existingPhoneUser.user_id) !== currentUser.userId) {
      throwDuplicateAccount(["phone"]);
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
  await executeQuery("UPDATE customers_by_id SET full_name = ?, phone = ? WHERE user_id = ?", [
    input.fullName,
    input.phone,
    currentUser.userId,
  ]);
  await executeQuery("UPDATE users_by_email SET full_name = ? WHERE email = ?", [
    input.fullName,
    user.email,
  ]);
  await executeQuery(
    "UPDATE users_by_phone SET email = ?, full_name = ?, role = ?, status = ?, created_at = ? WHERE phone = ?",
    [user.email, input.fullName, CUSTOMER_ROLE, ACTIVE_STATUS, user.created_at ?? now, input.phone],
  );

  if (user.created_at) {
    await executeQuery(
      "UPDATE users_by_role SET full_name = ?, phone = ? WHERE role = ? AND status = ? AND created_at = ? AND user_id = ?",
      [input.fullName, input.phone, user.role, user.status, user.created_at, currentUser.userId],
    );
  }

  await executeQuery(
    `UPDATE user_profile_by_id
     SET full_name = ?, gender = ?, birth_date = ?, address = ?, nationality = ?, passport_number = ?,
         emergency_contact_name = ?, emergency_contact_phone = ?, updated_at = ?
     WHERE user_id = ?`,
    [
      input.fullName,
      input.gender ?? null,
      input.birthDate ? types.LocalDate.fromString(input.birthDate) : null,
      input.address ?? null,
      input.nationality ?? null,
      input.passportNumber ?? null,
      input.emergencyContactName ?? null,
      input.emergencyContactPhone ?? null,
      now,
      currentUser.userId,
    ],
  );

  if (phoneChanged && previousPhone) {
    await executeQuery("DELETE FROM users_by_phone WHERE phone = ?", [previousPhone]);
  }

  const updatedUser = await findUserById(currentUser.userId);

  if (!updatedUser) {
    throw new AuthError("Không thể tải hồ sơ sau khi cập nhật.", 500);
  }

  return toAccountProfile(updatedUser, await findProfileByUserId(currentUser.userId));
}
