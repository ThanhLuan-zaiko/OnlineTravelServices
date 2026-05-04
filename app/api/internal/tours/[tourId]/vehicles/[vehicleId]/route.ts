import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteTourVehicle, findInternalTour, updateTourVehicle } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { tourVehicleMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    tourId: string;
    vehicleId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { tourId, vehicleId } = await context.params;
    const tour = await findInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    const input = tourVehicleMutationSchema.parse(await request.json());
    const vehicle = await updateTourVehicle(tourId, vehicleId, input);

    if (!vehicle) {
      return internalJson({ message: "Không tìm thấy phương tiện." }, { status: 404 });
    }

    return internalJson({ vehicle });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật phương tiện.", {
      route: "/api/internal/tours/[tourId]/vehicles/[vehicleId]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { tourId, vehicleId } = await context.params;
    const tour = await findInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    const vehicle = await deleteTourVehicle(tourId, vehicleId);

    if (!vehicle) {
      return internalJson({ message: "Không tìm thấy phương tiện." }, { status: 404 });
    }

    return internalJson({ vehicle });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa phương tiện.", {
      route: "/api/internal/tours/[tourId]/vehicles/[vehicleId]#DELETE",
    });
  }
}
