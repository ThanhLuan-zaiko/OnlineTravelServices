import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { findInternalService, findServiceMedia, setServiceMediaCover } from "@/lib/server/internal-data";
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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { destinationId, mediaId, serviceId, serviceType } = await context.params;
    const service = await findInternalService(destinationId, serviceType, serviceId);

    if (!service) {
      return internalJson({ message: "Không tìm thấy dịch vụ." }, { status: 404 });
    }

    const existing = await findServiceMedia(destinationId, serviceType, serviceId, mediaId);

    if (!existing) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    const media = await setServiceMediaCover(destinationId, serviceType, serviceId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    return internalJson({ media });
  } catch (error) {
    return internalErrorResponse(error, "Không thể đặt ảnh đại diện dịch vụ.", {
      route: "/api/internal/services/[destinationId]/[serviceType]/[serviceId]/media/[mediaId]/cover#PATCH",
    });
  }
}
