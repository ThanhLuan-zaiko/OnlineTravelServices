import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AUTH_COOKIE_NAME,
  AuthError,
  getAuthCookieOptions,
  loginCustomer,
} from "@/lib/server/auth";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { loginRequestSchema } from "@/lib/shared/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  if (error instanceof AuthError) {
    return { message: error.message, status: error.status };
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message;

    return {
      message:
        message && !message.startsWith("Invalid input")
          ? message
          : "Dữ liệu đăng nhập không hợp lệ.",
      status: 400,
    };
  }

  return { message: "Không thể đăng nhập lúc này.", status: 500 };
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const input = loginRequestSchema.parse(await request.json());
    const { user, session } = await loginCustomer(input, request);
    const response = NextResponse.json(
      { user },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    response.cookies.set(
      AUTH_COOKIE_NAME,
      session.cookieValue,
      getAuthCookieOptions(session.expiresAt),
    );

    return response;
  } catch (error) {
    const { message, status } = getErrorMessage(error);

    return NextResponse.json({ message }, { status });
  }
}
