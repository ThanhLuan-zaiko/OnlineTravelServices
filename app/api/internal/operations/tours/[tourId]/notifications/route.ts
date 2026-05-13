import { requireOperationsAccess } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  listOperationNotificationsByTour,
  sendOperationCustomerNotification,
  writeInternalAuditEvent,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { operationCustomerNotificationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    tourId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireOperationsAccess(request);
    const { tourId } = await context.params;
    const notifications = await listOperationNotificationsByTour(tourId);

    return internalJson({ notifications });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải thông báo cập nhật tour.", {
      route: "/api/internal/operations/tours/[tourId]/notifications#GET",
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireOperationsAccess(request);
    const { tourId } = await context.params;
    const payload = operationCustomerNotificationSchema.parse(await request.json());
    const notification = await sendOperationCustomerNotification({
      actorUserId: user.userId,
      payload,
      tourId,
    });

    await writeInternalAuditEvent({
      action: "operation_customer_notification",
      actor: user,
      description: `Gửi thông báo cập nhật tour: ${notification.title}.`,
      entityId: tourId,
      entityType: "tour",
      request,
    });

    return internalJson({ notification }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể gửi thông báo cập nhật tour.", {
      route: "/api/internal/operations/tours/[tourId]/notifications#POST",
    });
  }
}
