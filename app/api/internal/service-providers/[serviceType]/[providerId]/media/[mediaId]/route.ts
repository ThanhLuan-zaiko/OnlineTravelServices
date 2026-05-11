import { rm } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteServiceProviderMedia, findInternalServiceProviderById, findServiceProviderMedia, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    mediaId: string;
    providerId: string;
    serviceType: string;
  }>;
};

async function removeStoredFile(publicUrl: string) {
  await rm(path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, "")), { force: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { mediaId, providerId, serviceType } = await context.params;
    const provider = await findInternalServiceProviderById(serviceType, providerId);

    if (!provider) {
      return internalJson({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
    }

    const media = await findServiceProviderMedia(serviceType, providerId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await Promise.all([removeStoredFile(media.mediaUrl), removeStoredFile(media.thumbnailUrl)]);
    const deleted = await deleteServiceProviderMedia(serviceType, providerId, mediaId);

    if (!deleted) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "media_delete",
      actor: user,
      description: `Xóa ảnh khỏi nhà cung cấp ${provider.providerName}.`,
      entityId: provider.providerId,
      entityType: "service_provider",
      request,
    });

    return internalJson({ media: deleted });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa ảnh nhà cung cấp.", {
      route: "/api/internal/service-providers/[serviceType]/[providerId]/media/[mediaId]#DELETE",
    });
  }
}
