import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AUTH_COOKIE_NAME,
  AuthError,
  getAuthCookieOptions,
  loginCustomer,
  registerCustomer,
} from "@/lib/server/auth";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { loginRequestSchema, registerRequestSchema } from "@/lib/shared/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  if (error instanceof AuthError) {
    return { fields: error.fields, message: error.message, status: error.status };
  }

  if (error instanceof ZodError) {
    const message = error.issues[0]?.message;

    return {
      message:
        message && !message.startsWith("Invalid input")
          ? message
          : "Dữ liệu đăng ký không hợp lệ.",
      fields: [],
      status: 400,
    };
  }

  return { fields: [], message: "Không thể đăng ký lúc này.", status: 500 };
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const registerInput = registerRequestSchema.parse(await request.json());
    const user = await registerCustomer(registerInput, request);
    const loginInput = loginRequestSchema.parse({
      email: registerInput.email,
      password: registerInput.password,
    });
    const { session } = await loginCustomer(loginInput, request);
    const response = NextResponse.json(
      { user },
      {
        status: 201,
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
    const { fields, message, status } = getErrorMessage(error);

    return NextResponse.json({ fields, message }, { status });
  }
}
