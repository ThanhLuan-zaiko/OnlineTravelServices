import { requireOperationsStatisticsStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { listTourOperationEvents } from "@/lib/server/internal-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    tourId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireOperationsStatisticsStaff(request);
    const { tourId } = await context.params;
    const events = await listTourOperationEvents(tourId);

    return internalJson({ events });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải lịch sử vận hành tour.", {
      route: "/api/internal/operations/tours/[tourId]/events#GET",
    });
  }
}
