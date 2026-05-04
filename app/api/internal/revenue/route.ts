import { z } from "zod";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { getRevenueDashboard } from "@/lib/server/internal-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

function getTodayString() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const day = daySchema.parse(searchParams.get("day") ?? getTodayString());
    const month = monthSchema.parse(searchParams.get("month") ?? day.slice(0, 7));
    const revenue = await getRevenueDashboard({ day, month });

    return internalJson({ revenue });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải thống kê doanh thu.", {
      route: "/api/internal/revenue#GET",
    });
  }
}
