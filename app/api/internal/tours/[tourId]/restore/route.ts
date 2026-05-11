import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { restoreInternalTour, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

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
    const user = await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const tour = await restoreInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "restore",
      actor: user,
      description: `Khôi phục tour ${tour.title}.`,
      entityId: tour.tourId,
      entityType: "tour",
      request,
    });

    return internalJson({ tour });
  } catch (error) {
    return internalErrorResponse(error, "Không thể khôi phục tour.", { route: "/api/internal/tours/[tourId]/restore#PATCH" });
  }
}
