import { z } from "zod";

import { requireOperationsAccess } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  createOperationReport,
  listOperationReports,
  writeInternalAuditEvent,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { operationReportMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const periodTypeSchema = z.enum(["day", "week", "month", "year"]);

export async function GET(request: Request) {
  try {
    await requireOperationsAccess(request);
    const { searchParams } = new URL(request.url);
    const periodType = periodTypeSchema.parse(searchParams.get("periodType") ?? "month");
    const periodValue = z.string().min(1).parse(searchParams.get("periodValue") ?? new Date().toISOString().slice(0, 7));
    const cursor = searchParams.get("cursor");
    const reports = await listOperationReports({ cursor, periodType, periodValue });

    return internalJson(reports);
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải báo cáo vận hành.", {
      route: "/api/internal/operations/reports#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireOperationsAccess(request);
    const payload = operationReportMutationSchema.parse(await request.json());
    const report = await createOperationReport({ actorUserId: user.userId, payload });

    await writeInternalAuditEvent({
      action: "operation_report_create",
      actor: user,
      description: `Tạo báo cáo vận hành ${report.title}.`,
      entityId: report.reportId,
      entityType: "operation_report",
      request,
    });

    return internalJson({ report }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo báo cáo vận hành.", {
      route: "/api/internal/operations/reports#POST",
    });
  }
}
