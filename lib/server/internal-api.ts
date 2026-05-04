import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthError } from "@/lib/server/auth";
import { logServerError } from "@/lib/server/server-log";

type InternalErrorContext = {
  route?: string;
};

export function internalJson(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });
}

export function internalErrorResponse(
  error: unknown,
  fallbackMessage = "Không thể xử lý yêu cầu nội bộ lúc này.",
  context?: InternalErrorContext,
) {
  if (error instanceof AuthError) {
    return internalJson({ fields: error.fields, message: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    const issue = error.issues[0];

    return internalJson(
      {
        fields: error.issues.map((currentIssue) => String(currentIssue.path[0] ?? "")).filter(Boolean),
        message: issue?.message && !issue.message.startsWith("Invalid input") ? issue.message : "Dữ liệu không hợp lệ.",
      },
      { status: 400 },
    );
  }

  logServerError("internal route failed", error, {
    fallbackMessage,
    route: context?.route,
  });

  return internalJson({ fields: [], message: fallbackMessage }, { status: 500 });
}
