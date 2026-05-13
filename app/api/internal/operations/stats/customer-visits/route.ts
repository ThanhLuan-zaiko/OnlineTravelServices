import { z } from "zod";

import { requireOperationsAccess } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { listOperationCustomerVisitStats } from "@/lib/server/internal-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const periodTypeSchema = z.enum(["day", "week", "month", "year"]);

export async function GET(request: Request) {
  try {
    await requireOperationsAccess(request);
    const { searchParams } = new URL(request.url);
    const periodType = periodTypeSchema.parse(searchParams.get("periodType") ?? "month");
    const limit = Number(searchParams.get("limit") ?? "20");
    const stats = await listOperationCustomerVisitStats({ periodType, limit });

    return internalJson({ stats });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải thống kê khách hàng theo địa điểm.", {
      route: "/api/internal/operations/stats/customer-visits#GET",
    });
  }
}
