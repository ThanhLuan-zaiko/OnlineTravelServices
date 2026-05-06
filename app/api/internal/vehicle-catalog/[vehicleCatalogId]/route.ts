import { rm } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  archiveInternalVehicleCatalog,
  updateInternalVehicleCatalog,
  hardDeleteInternalVehicleCatalog,
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

function toAbsolutePublicPath(publicUrl: string) {
  return path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, ""));
}

async function removeStoredFile(publicUrl: string | null) {
  if (!publicUrl) {
    return;
  }

  await rm(toAbsolutePublicPath(publicUrl), { force: true });
}

async function removeVehicleCatalogFolder(vehicleCatalogId: string) {
  await rm(path.join(process.cwd(), "public", "uploads", "vehicle-catalog", vehicleCatalogId), {
    force: true,
    recursive: true,
  });
}

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
    const { searchParams } = new URL(request.url);

    if (searchParams.get("mode") === "hard") {
      const deleted = await hardDeleteInternalVehicleCatalog(vehicleCatalogId);

      if (!deleted) {
        return internalJson({ message: "Không tìm thấy phương tiện." }, { status: 404 });
      }

      await Promise.all([
        removeStoredFile(deleted.catalogItem.imageUrl),
        removeStoredFile(deleted.catalogItem.thumbnailUrl),
        ...deleted.media.flatMap((media) => [removeStoredFile(media.mediaUrl), removeStoredFile(media.thumbnailUrl)]),
      ]);
      await removeVehicleCatalogFolder(vehicleCatalogId);

      return internalJson({
        catalogItem: deleted.catalogItem,
        message: "Phương tiện đã bị xóa vĩnh viễn.",
      });
    }

    const catalogItem = await archiveInternalVehicleCatalog(vehicleCatalogId);

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
