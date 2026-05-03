import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  AUTH_COOKIE_NAME,
  AuthError,
  getCurrentCustomerProfile,
  updateCurrentCustomerProfile,
} from "@/lib/server/auth";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { accountProfileRequestSchema } from "@/lib/shared/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getAuthCookieValue(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);
}

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
          : "Thông tin tài khoản không hợp lệ.",
      fields: [],
      status: 400,
    };
  }

  return { fields: [], message: "Không thể xử lý thông tin tài khoản lúc này.", status: 500 };
}

export async function GET(request: Request) {
  try {
    const profile = await getCurrentCustomerProfile(getAuthCookieValue(request));

    return NextResponse.json(
      { profile },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const { fields, message, status } = getErrorMessage(error);

    return NextResponse.json(
      { fields, message },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOriginRequest(request);
    const input = accountProfileRequestSchema.parse(await request.json());
    const profile = await updateCurrentCustomerProfile(getAuthCookieValue(request), input);

    return NextResponse.json(
      { profile },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const { fields, message, status } = getErrorMessage(error);

    return NextResponse.json(
      { fields, message },
      {
        status,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
