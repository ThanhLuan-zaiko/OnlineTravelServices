import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { findInternalTour, setTourMediaCover, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { syncPublicTourProjection } from "@/lib/server/public-tours";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    mediaId: string;
    tourId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { mediaId, tourId } = await context.params;
    const tour = await findInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    const media = await setTourMediaCover(tourId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "media_cover",
      actor: user,
      description: `Đặt ảnh đại diện cho tour ${tour.title}.`,
      entityId: tour.tourId,
      entityType: "tour",
      request,
    });
    await syncPublicTourProjection(tour.tourId);

    return internalJson({ media });
  } catch (error) {
    return internalErrorResponse(error, "Không thể đặt ảnh đại diện tour.", {
      route: "/api/internal/tours/[tourId]/media/[mediaId]/cover#PATCH",
    });
  }
}
