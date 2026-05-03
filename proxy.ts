import { NextResponse, type NextRequest } from "next/server";

const RATE_LIMIT_COOKIE = "online-travel-request-guard";
const COOKIE_TTL_SECONDS = 5 * 60;

type RateLimitBucketName = "auth" | "page";

type RateLimitBucket = {
  blockedUntil: number;
  count: number;
  windowStart: number;
};

type RateLimitPayload = {
  buckets: Partial<Record<RateLimitBucketName, RateLimitBucket>>;
  fingerprint: string;
  version: 1;
};

type RateLimitRule = {
  blockMs: number;
  limit: number;
  windowMs: number;
};

const rateLimitRules: Record<RateLimitBucketName, RateLimitRule> = {
  auth: {
    blockMs: 60_000,
    limit: 12,
    windowMs: 60_000,
  },
  page: {
    blockMs: 15_000,
    limit: 45,
    windowMs: 30_000,
  },
};

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "development-middleware-secret-minimum-32";
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function hmac(value: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthSecret()),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return base64UrlEncode(new Uint8Array(signature));
}

async function signPayload(payload: string) {
  return `${payload}.${await hmac(payload)}`;
}

async function readSignedPayload(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature || signature !== (await hmac(payload))) {
    return null;
  }

  try {
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(payload))) as RateLimitPayload;
  } catch {
    return null;
  }
}

function getClientFingerprint(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";

  return `${forwardedFor.slice(0, 64)}|${userAgent.slice(0, 160)}`;
}

async function getFingerprintHash(request: NextRequest) {
  return hmac(getClientFingerprint(request));
}

function getBucketName(pathname: string): RateLimitBucketName {
  if (pathname.startsWith("/api/auth")) {
    return "auth";
  }

  return "page";
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function isSkippablePath(pathname: string) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap") ||
    /\.(?:avif|css|gif|ico|jpg|jpeg|js|map|png|svg|txt|webp|woff|woff2)$/.test(pathname)
  );
}

function createRateLimitResponse(pathname: string, retryAfterSeconds: number) {
  if (isApiPath(pathname)) {
    return NextResponse.json(
      {
        message: "Bạn thao tác quá nhanh. Vui lòng thử lại sau vài giây.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfterSeconds),
        },
        status: 429,
      },
    );
  }

  return new NextResponse(
    `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="${retryAfterSeconds};url=${pathname}" />
    <title>Thao tác quá nhanh</title>
  </head>
  <body style="font-family: system-ui, sans-serif; min-height: 100vh; display: grid; place-items: center; margin: 0; background: #f8fafc; color: #0f172a;">
    <main style="max-width: 420px; padding: 28px; border: 1px solid #e2e8f0; border-radius: 18px; background: white; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);">
      <p style="margin: 0 0 8px; font-size: 14px; font-weight: 700; color: #0284c7;">Online Travel Services</p>
      <h1 style="margin: 0 0 12px; font-size: 26px;">Bạn thao tác hơi nhanh</h1>
      <p style="margin: 0; line-height: 1.6; color: #475569;">Vui lòng chờ ${retryAfterSeconds} giây rồi tải lại trang. Cơ chế này giúp hệ thống ổn định khi có nhiều lần làm mới liên tục.</p>
    </main>
  </body>
</html>`,
    {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "Retry-After": String(retryAfterSeconds),
      },
      status: 429,
    },
  );
}

async function setRateLimitCookie(response: NextResponse, payload: RateLimitPayload) {
  const encodedPayload = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const cookieValue = await signPayload(encodedPayload);

  response.cookies.set(RATE_LIMIT_COOKIE, cookieValue, {
    httpOnly: true,
    maxAge: COOKIE_TTL_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isSkippablePath(pathname)) {
    return NextResponse.next();
  }

  const bucketName = getBucketName(pathname);
  const rule = rateLimitRules[bucketName];
  const now = Date.now();
  const fingerprint = await getFingerprintHash(request);
  const storedPayload = await readSignedPayload(request.cookies.get(RATE_LIMIT_COOKIE)?.value);
  const payload: RateLimitPayload =
    storedPayload?.fingerprint === fingerprint
      ? storedPayload
      : {
          buckets: {},
          fingerprint,
          version: 1,
        };
  const currentBucket = payload.buckets[bucketName];
  const bucket =
    currentBucket && now - currentBucket.windowStart <= rule.windowMs
      ? currentBucket
      : {
          blockedUntil: 0,
          count: 0,
          windowStart: now,
        };

  if (bucket.blockedUntil > now) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000));
    const response = createRateLimitResponse(pathname, retryAfterSeconds);
    await setRateLimitCookie(response, payload);

    return response;
  }

  bucket.count += 1;

  if (bucket.count > rule.limit) {
    bucket.blockedUntil = now + rule.blockMs;
    payload.buckets[bucketName] = bucket;

    const retryAfterSeconds = Math.ceil(rule.blockMs / 1000);
    const response = createRateLimitResponse(pathname, retryAfterSeconds);
    await setRateLimitCookie(response, payload);

    return response;
  }

  payload.buckets[bucketName] = bucket;

  const response = NextResponse.next();
  await setRateLimitCookie(response, payload);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
