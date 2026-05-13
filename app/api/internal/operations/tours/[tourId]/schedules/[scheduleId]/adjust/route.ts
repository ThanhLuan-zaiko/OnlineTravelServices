import { requireOperationsStatisticsStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { adjustOperationSchedule, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { syncPublicTourProjection } from "@/lib/server/public-tours";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { operationScheduleAdjustmentSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    scheduleId: string;
    tourId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireOperationsStatisticsStaff(request);
    const { scheduleId, tourId } = await context.params;
    const payload = operationScheduleAdjustmentSchema.parse(await request.json());
    const schedule = await adjustOperationSchedule({ payload, scheduleId, tourId });

    if (!schedule) {
      return internalJson({ message: "Không tìm thấy lịch khởi hành." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "operation_schedule_adjust",
      actor: user,
      description: `Điều chỉnh lịch khởi hành ${schedule.departureDate} ${schedule.departureTime}.`,
      entityId: tourId,
      entityType: "tour",
      request,
    });
    await syncPublicTourProjection(tourId);

    return internalJson({ schedule });
  } catch (error) {
    return internalErrorResponse(error, "Không thể điều chỉnh lịch khởi hành.", {
      route: "/api/internal/operations/tours/[tourId]/schedules/[scheduleId]/adjust#PATCH",
    });
  }
}
