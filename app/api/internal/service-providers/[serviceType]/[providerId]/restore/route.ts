import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { restoreInternalServiceProvider } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    providerId: string;
    serviceType: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { providerId, serviceType } = await context.params;
    const provider = await restoreInternalServiceProvider(serviceType, providerId);

    if (!provider) {
      return internalJson({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
    }

    return internalJson({ provider });
  } catch (error) {
    return internalErrorResponse(error, "Không thể khôi phục nhà cung cấp.", {
      route: "/api/internal/service-providers/[serviceType]/[providerId]/restore#PATCH",
    });
  }
}
