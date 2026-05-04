import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { listItineraryByTour, upsertItineraryItem } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { itineraryMutationSchema } from "@/lib/shared/internal";

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
    const items = await listItineraryByTour(tourId);

    return internalJson({ items });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải lịch trình tour.", {
      route: "/api/internal/tours/[tourId]/itinerary#GET",
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const input = itineraryMutationSchema.parse(await request.json());
    const item = await upsertItineraryItem(tourId, input);

    return internalJson({ item }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể lưu lịch trình tour.", {
      route: "/api/internal/tours/[tourId]/itinerary#POST",
    });
  }
}
