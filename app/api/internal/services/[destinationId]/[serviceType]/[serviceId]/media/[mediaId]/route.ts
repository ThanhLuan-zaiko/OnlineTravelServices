import { rm } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteServiceMedia, findInternalService, findServiceMedia } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    destinationId: string;
    mediaId: string;
    serviceId: string;
    serviceType: string;
  }>;
};

async function removeStoredFile(publicUrl: string) {
  await rm(path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, "")), { force: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { destinationId, mediaId, serviceId, serviceType } = await context.params;
    const service = await findInternalService(destinationId, serviceType, serviceId);

    if (!service) {
      return internalJson({ message: "Không tìm thấy dịch vụ." }, { status: 404 });
    }

    const media = await findServiceMedia(destinationId, serviceType, serviceId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await Promise.all([removeStoredFile(media.mediaUrl), removeStoredFile(media.thumbnailUrl)]);
    const deleted = await deleteServiceMedia(destinationId, serviceType, serviceId, mediaId);

    if (!deleted) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    return internalJson({ media: deleted });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa ảnh dịch vụ.", {
      route: "/api/internal/services/[destinationId]/[serviceType]/[serviceId]/media/[mediaId]#DELETE",
    });
  }
}
