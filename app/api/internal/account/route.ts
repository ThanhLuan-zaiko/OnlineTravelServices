import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAuthCookieValue } from "@/lib/server/auth";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import {
  getCurrentInternalStaffProfile,
  updateCurrentInternalStaffProfile,
} from "@/lib/server/internal-account";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { internalAccountProfileRequestSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message;

    return {
      fields: error.issues.map((issue) => String(issue.path[0] ?? "")).filter(Boolean),
      message:
        message && !message.startsWith("Invalid input")
          ? message
          : "Thông tin tài khoản không hợp lệ.",
      status: 400,
    };
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const profile = await getCurrentInternalStaffProfile(getAuthCookieValue(request));

    return internalJson({ profile });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xử lý thông tin tài khoản nội bộ.", {
      route: "/api/internal/account#GET",
    });
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOriginRequest(request);
    const input = internalAccountProfileRequestSchema.parse(await request.json());
    const profile = await updateCurrentInternalStaffProfile(getAuthCookieValue(request), input);

    return internalJson({ profile });
  } catch (error) {
    const normalized = getErrorMessage(error);

    if (normalized) {
      return NextResponse.json(
        { fields: normalized.fields, message: normalized.message },
        {
          status: normalized.status,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return internalErrorResponse(error, "Không thể cập nhật thông tin tài khoản nội bộ.", {
      route: "/api/internal/account#PATCH",
    });
  }
}
