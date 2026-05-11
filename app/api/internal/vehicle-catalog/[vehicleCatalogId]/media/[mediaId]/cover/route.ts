import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { findInternalVehicleCatalog, setVehicleCatalogMediaCover, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    mediaId: string;
    vehicleCatalogId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { mediaId, vehicleCatalogId } = await context.params;
    const catalogItem = await findInternalVehicleCatalog(vehicleCatalogId);

    if (!catalogItem) {
      return internalJson({ message: "Không tìm thấy phương tiện." }, { status: 404 });
    }

    const media = await setVehicleCatalogMediaCover(vehicleCatalogId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "media_cover",
      actor: user,
      description: `Đặt ảnh đại diện cho phương tiện ${catalogItem.label}.`,
      entityId: catalogItem.vehicleCatalogId,
      entityType: "vehicle_catalog",
      request,
    });

    return internalJson({ media });
  } catch (error) {
    return internalErrorResponse(error, "Không thể đặt ảnh đại diện.", {
      route: "/api/internal/vehicle-catalog/[vehicleCatalogId]/media/[mediaId]/cover#PATCH",
    });
  }
}
