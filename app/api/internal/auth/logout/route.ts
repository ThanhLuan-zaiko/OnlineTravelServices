import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  getAuthCookieValue,
  getClearAuthCookieOptions,
  logoutCustomer,
} from "@/lib/server/auth";
import { internalErrorResponse } from "@/lib/server/internal-api";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await logoutCustomer(getAuthCookieValue(request));

    const response = NextResponse.json(
      { message: "Đã đăng xuất." },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
    response.cookies.set(AUTH_COOKIE_NAME, "", getClearAuthCookieOptions());

    return response;
  } catch (error) {
    return internalErrorResponse(error, "Không thể đăng xuất lúc này.", {
      route: "/api/internal/auth/logout#POST",
    });
  }
}
