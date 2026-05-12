import { z } from "zod";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteSchedule, updateSchedule } from "@/lib/server/internal-data";
import { syncPublicTourProjection } from "@/lib/server/public-tours";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { scheduleMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const departureDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

type RouteContext = {
  params: Promise<{
    scheduleId: string;
    tourId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { scheduleId, tourId } = await context.params;
    const input = scheduleMutationSchema.parse(await request.json());
    const schedule = await updateSchedule(tourId, scheduleId, input);
    await syncPublicTourProjection(tourId);

    return internalJson({ schedule });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật lịch khởi hành.", {
      route: "/api/internal/tours/[tourId]/schedules/[scheduleId]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { scheduleId, tourId } = await context.params;
    const { searchParams } = new URL(request.url);
    const departureDate = departureDateSchema.parse(searchParams.get("departureDate"));

    await deleteSchedule(tourId, scheduleId, departureDate);
    await syncPublicTourProjection(tourId);

    return internalJson({ message: "Đã xóa lịch khởi hành." });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa lịch khởi hành.", {
      route: "/api/internal/tours/[tourId]/schedules/[scheduleId]#DELETE",
    });
  }
}
