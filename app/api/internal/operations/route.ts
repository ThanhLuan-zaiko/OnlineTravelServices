import { z } from "zod";

import { requireOperationsStatisticsStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { getOperationsDashboard } from "@/lib/server/internal-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);
const periodTypeSchema = z.enum(["day", "week", "month", "year"]);

function today() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    await requireOperationsStatisticsStaff(request);
    const { searchParams } = new URL(request.url);
    const day = daySchema.parse(searchParams.get("day") ?? today());
    const month = monthSchema.parse(searchParams.get("month") ?? day.slice(0, 7));
    const periodType = periodTypeSchema.parse(searchParams.get("periodType") ?? "month");
    const operations = await getOperationsDashboard({ day, month, periodType });

    return internalJson({ operations });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải bảng vận hành và thống kê.", {
      route: "/api/internal/operations#GET",
    });
  }
}
