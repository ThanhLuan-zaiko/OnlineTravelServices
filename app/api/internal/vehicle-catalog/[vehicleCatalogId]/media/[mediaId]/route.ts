import { rm } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteVehicleCatalogMedia, findInternalVehicleCatalog, findVehicleCatalogMedia, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    mediaId: string;
    vehicleCatalogId: string;
  }>;
};

async function removeStoredFile(publicUrl: string) {
  const relativePath = publicUrl.replace(/^\/+/, "");
  const fullPath = path.join(process.cwd(), "public", relativePath);

  await rm(fullPath, { force: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { mediaId, vehicleCatalogId } = await context.params;
    const catalogItem = await findInternalVehicleCatalog(vehicleCatalogId);

    if (!catalogItem) {
      return internalJson({ message: "Không tìm thấy phương tiện." }, { status: 404 });
    }

    const media = await findVehicleCatalogMedia(vehicleCatalogId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await Promise.all([removeStoredFile(media.mediaUrl), removeStoredFile(media.thumbnailUrl)]);
    const deleted = await deleteVehicleCatalogMedia(vehicleCatalogId, mediaId);

    if (!deleted) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "media_delete",
      actor: user,
      description: `Xóa ảnh khỏi phương tiện ${catalogItem.label}.`,
      entityId: catalogItem.vehicleCatalogId,
      entityType: "vehicle_catalog",
      request,
    });

    return internalJson({ media: deleted });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa ảnh phương tiện.", {
      route: "/api/internal/vehicle-catalog/[vehicleCatalogId]/media/[mediaId]#DELETE",
    });
  }
}
