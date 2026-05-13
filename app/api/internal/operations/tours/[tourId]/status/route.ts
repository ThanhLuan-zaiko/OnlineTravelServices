import { requireOperationsStatisticsStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { updateTourOperationStatus, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { operationTourStatusMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    tourId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireOperationsStatisticsStaff(request);
    const { tourId } = await context.params;
    const payload = operationTourStatusMutationSchema.parse(await request.json());
    const event = await updateTourOperationStatus({ actorUserId: user.userId, payload, tourId });

    if (!event) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "operation_status_update",
      actor: user,
      description: `Cập nhật trạng thái vận hành tour ${event.tourTitle}: ${event.status}.`,
      entityId: event.tourId,
      entityType: "tour",
      request,
    });

    return internalJson({ event });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật trạng thái vận hành tour.", {
      route: "/api/internal/operations/tours/[tourId]/status#PATCH",
    });
  }
}
