import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  clearInternalVehicleCatalogImage,
  setInternalVehicleCatalogImage,
  writeInternalAuditEvent,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    vehicleCatalogId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { vehicleCatalogId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return internalJson({ message: "Vui lòng chọn ảnh." }, { status: 400 });
    }

    const catalogItem = await setInternalVehicleCatalogImage(vehicleCatalogId, {
      sourceBuffer: Buffer.from(await file.arrayBuffer()),
      sourceName: file.name,
      uploadedBy: user.userId,
    });

    if (!catalogItem) {
      return internalJson({ message: "Không tìm thấy phương tiện." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "image_upload",
      actor: user,
      description: `Upload ảnh chính cho phương tiện ${catalogItem.label}.`,
      entityId: catalogItem.vehicleCatalogId,
      entityType: "vehicle_catalog",
      request,
    });

    return internalJson({ catalogItem });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải ảnh phương tiện.", {
      route: "/api/internal/vehicle-catalog/[vehicleCatalogId]/image#POST",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { vehicleCatalogId } = await context.params;
    const catalogItem = await clearInternalVehicleCatalogImage(vehicleCatalogId);

    if (!catalogItem) {
      return internalJson({ message: "Không tìm thấy phương tiện." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "image_delete",
      actor: user,
      description: `Xóa ảnh chính khỏi phương tiện ${catalogItem.label}.`,
      entityId: catalogItem.vehicleCatalogId,
      entityType: "vehicle_catalog",
      request,
    });

    return internalJson({ catalogItem });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa ảnh phương tiện.", {
      route: "/api/internal/vehicle-catalog/[vehicleCatalogId]/image#DELETE",
    });
  }
}
