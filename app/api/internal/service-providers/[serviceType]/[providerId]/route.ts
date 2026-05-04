import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteInternalServiceProvider, updateInternalServiceProvider } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { serviceProviderMutationSchema } from "@/lib/shared/internal";

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
    const input = serviceProviderMutationSchema.parse(await request.json());
    const provider = await updateInternalServiceProvider(serviceType, providerId, input);

    if (!provider) {
      return internalJson({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
    }

    return internalJson({ provider });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật nhà cung cấp.", {
      route: "/api/internal/service-providers/[serviceType]/[providerId]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { providerId, serviceType } = await context.params;
    const provider = await deleteInternalServiceProvider(serviceType, providerId);

    if (!provider) {
      return internalJson({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
    }

    return internalJson({ provider });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa nhà cung cấp.", {
      route: "/api/internal/service-providers/[serviceType]/[providerId]#DELETE",
    });
  }
}
