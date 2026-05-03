import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { AUTH_COOKIE_NAME } from "@/lib/server/auth-constants";
import { serverEnv } from "@/lib/server/env";

export type SessionCookiePayload = {
  userId: string;
  sessionId: string;
  token: string;
  expiresAt: string;
};

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string) {
  return createHmac("sha256", serverEnv.AUTH_SECRET)
    .update(payload)
    .digest("base64url");
}

export function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.byteLength === rightBuffer.byteLength &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function hashSessionToken(token: string) {
  return createHmac("sha256", serverEnv.AUTH_SECRET)
    .update(token)
    .digest("hex");
}

export function serializeSessionCookie(payload: SessionCookiePayload) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function parseSessionCookie(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature || !safeEqual(signature, signPayload(encodedPayload))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as Partial<SessionCookiePayload>;

    if (
      typeof payload.userId !== "string" ||
      typeof payload.sessionId !== "string" ||
      typeof payload.token !== "string" ||
      typeof payload.expiresAt !== "string"
    ) {
      return null;
    }

    return payload as SessionCookiePayload;
  } catch {
    return null;
  }
}

export function getAuthCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export function getClearAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export function getAuthCookieValue(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);
}
