import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { findInternalServiceProviderById, findServiceProviderMedia, setServiceProviderMediaCover, writeInternalAuditEvent } from "@/lib/server/internal-data";
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { mediaId, providerId, serviceType } = await context.params;
    const provider = await findInternalServiceProviderById(serviceType, providerId);

    if (!provider) {
      return internalJson({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
    }

    const existing = await findServiceProviderMedia(serviceType, providerId, mediaId);

    if (!existing) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    const media = await setServiceProviderMediaCover(serviceType, providerId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "media_cover",
      actor: user,
      description: `Đặt ảnh đại diện cho nhà cung cấp ${provider.providerName}.`,
      entityId: provider.providerId,
      entityType: "service_provider",
      request,
    });

    return internalJson({ media });
  } catch (error) {
    return internalErrorResponse(error, "Không thể đặt ảnh đại diện nhà cung cấp.", {
      route: "/api/internal/service-providers/[serviceType]/[providerId]/media/[mediaId]/cover#PATCH",
    });
  }
}
