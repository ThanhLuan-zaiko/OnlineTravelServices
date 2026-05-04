import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  deleteInternalVehicleCatalog,
  updateInternalVehicleCatalog,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { vehicleCatalogMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    vehicleCatalogId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { vehicleCatalogId } = await context.params;
    const input = vehicleCatalogMutationSchema.parse(await request.json());
    const catalogItem = await updateInternalVehicleCatalog(vehicleCatalogId, input);

    if (!catalogItem) {
      return internalJson({ message: "Không tìm thấy phương tiện." }, { status: 404 });
    }

    return internalJson({ catalogItem });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật phương tiện.", {
      route: "/api/internal/vehicle-catalog/[vehicleCatalogId]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { vehicleCatalogId } = await context.params;
    const catalogItem = await deleteInternalVehicleCatalog(vehicleCatalogId);

    if (!catalogItem) {
      return internalJson({ message: "Không tìm thấy phương tiện." }, { status: 404 });
    }

    return internalJson({ catalogItem });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa phương tiện.", {
      route: "/api/internal/vehicle-catalog/[vehicleCatalogId]#DELETE",
    });
  }
}
