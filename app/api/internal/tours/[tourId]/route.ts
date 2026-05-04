import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { archiveInternalTour, findInternalTour, updateInternalTour } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { tourMutationSchema } from "@/lib/shared/internal";

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
    const tour = await findInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    return internalJson({ tour });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải tour.", { route: "/api/internal/tours/[tourId]#GET" });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const input = tourMutationSchema.parse(await request.json());
    const tour = await updateInternalTour(tourId, input);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    return internalJson({ tour });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật tour.", { route: "/api/internal/tours/[tourId]#PATCH" });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const tour = await archiveInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    return internalJson({ tour });
  } catch (error) {
    return internalErrorResponse(error, "Không thể lưu trữ tour.", { route: "/api/internal/tours/[tourId]#DELETE" });
  }
}
