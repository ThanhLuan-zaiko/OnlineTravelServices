import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { restoreInternalVehicleCatalog } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

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
    const catalogItem = await restoreInternalVehicleCatalog(vehicleCatalogId);

    if (!catalogItem) {
      return internalJson({ message: "Không tìm thấy phương tiện." }, { status: 404 });
    }

    return internalJson({ catalogItem });
  } catch (error) {
    return internalErrorResponse(error, "Không thể khôi phục phương tiện.", {
      route: "/api/internal/vehicle-catalog/[vehicleCatalogId]/restore#PATCH",
    });
  }
}
