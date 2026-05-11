import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { markStaffNotificationRead } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { notificationId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { notificationTime?: string };

    if (!body.notificationTime) {
      return internalJson({ fields: ["notificationTime"], message: "Thiếu thời gian thông báo." }, { status: 400 });
    }

    const readAt = await markStaffNotificationRead({
      notificationId,
      notificationTime: body.notificationTime,
      staffId: user.userId,
    });

    return internalJson({ readAt });
  } catch (error) {
    return internalErrorResponse(error, "Không thể đánh dấu đã đọc.", {
      route: "/api/internal/notifications/[notificationId]/read#PATCH",
    });
  }
}
