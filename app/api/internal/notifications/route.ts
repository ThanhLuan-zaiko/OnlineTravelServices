import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { listStaffNotifications } from "@/lib/server/internal-data";
import { staffNotificationStatusSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const status = staffNotificationStatusSchema.parse(searchParams.get("status") ?? "all");
    const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
    const page = await listStaffNotifications(user.userId, {
      cursor: searchParams.get("cursor"),
      limit: Number.isFinite(limit) ? limit : undefined,
      status,
    });

    return internalJson(page);
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải thông báo.", {
      route: "/api/internal/notifications#GET",
    });
  }
}
