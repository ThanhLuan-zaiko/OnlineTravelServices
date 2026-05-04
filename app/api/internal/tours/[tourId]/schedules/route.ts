import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createSchedule, listSchedulesByTour } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { scheduleMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    tourId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const schedules = await listSchedulesByTour(tourId);

    return internalJson({ schedules });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải lịch khởi hành.", {
      route: "/api/internal/tours/[tourId]/schedules#GET",
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const input = scheduleMutationSchema.parse(await request.json());
    const schedule = await createSchedule(tourId, input);

    return internalJson({ schedule }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo lịch khởi hành.", {
      route: "/api/internal/tours/[tourId]/schedules#POST",
    });
  }
}
