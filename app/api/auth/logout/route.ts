import { NextResponse } from "next/server";

import {
  AuthError,
  AUTH_COOKIE_NAME,
  getClearAuthCookieOptions,
  logoutCustomer,
} from "@/lib/server/auth";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { message: error.message },
        {
          status: error.status,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      { message: "Không thể đăng xuất lúc này." },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const cookieValue = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);

  await logoutCustomer(cookieValue);

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
}
