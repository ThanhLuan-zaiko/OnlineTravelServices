import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { restoreInternalService, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    destinationId: string;
    serviceId: string;
    serviceType: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { destinationId, serviceId, serviceType } = await context.params;
    const service = await restoreInternalService(destinationId, serviceType, serviceId);

    if (!service) {
      return internalJson({ message: "Không tìm thấy dịch vụ." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "restore",
      actor: user,
      description: `Khôi phục dịch vụ ${service.name}.`,
      entityId: service.serviceId,
      entityType: "service",
      request,
    });

    return internalJson({ service });
  } catch (error) {
    return internalErrorResponse(error, "Không thể khôi phục dịch vụ.", {
      route: "/api/internal/services/[destinationId]/[serviceType]/[serviceId]/restore#PATCH",
    });
  }
}
