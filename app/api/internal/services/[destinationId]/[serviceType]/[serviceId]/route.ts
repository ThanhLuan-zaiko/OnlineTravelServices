import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteInternalService, updateInternalService } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { serviceCatalogMutationSchema } from "@/lib/shared/internal";

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
    await requireAdministrativeStaff(request);
    const { destinationId, serviceId, serviceType } = await context.params;
    const input = serviceCatalogMutationSchema.parse(await request.json());
    const service = await updateInternalService(destinationId, serviceType, serviceId, input);

    if (!service) {
      return internalJson({ message: "Không tìm thấy dịch vụ." }, { status: 404 });
    }

    return internalJson({ service });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật dịch vụ.", {
      route: "/api/internal/services/[destinationId]/[serviceType]/[serviceId]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { destinationId, serviceId, serviceType } = await context.params;
    const service = await deleteInternalService(destinationId, serviceType, serviceId);

    if (!service) {
      return internalJson({ message: "Không tìm thấy dịch vụ." }, { status: 404 });
    }

    return internalJson({ service });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa dịch vụ.", {
      route: "/api/internal/services/[destinationId]/[serviceType]/[serviceId]#DELETE",
    });
  }
}
