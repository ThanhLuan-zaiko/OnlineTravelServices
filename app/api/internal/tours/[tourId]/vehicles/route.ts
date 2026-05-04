import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createTourVehicle, findInternalTour, listTourVehicles } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { tourVehicleMutationSchema } from "@/lib/shared/internal";

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

    const vehicles = await listTourVehicles(tourId);
    return internalJson({ vehicles });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải phương tiện tour.", {
      route: "/api/internal/tours/[tourId]/vehicles#GET",
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const tour = await findInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    const input = tourVehicleMutationSchema.parse(await request.json());
    const vehicle = await createTourVehicle(tourId, input);

    if (!vehicle) {
      return internalJson({ message: "Không thể tạo phương tiện." }, { status: 500 });
    }

    return internalJson({ vehicle }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo phương tiện.", {
      route: "/api/internal/tours/[tourId]/vehicles#POST",
    });
  }
}
