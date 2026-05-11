import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createInternalServiceProvider, listInternalServiceProviders, listInternalServiceProvidersPage, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { serviceProviderMutationSchema, serviceProviderStatusSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const serviceType = searchParams.get("serviceType")?.trim();
    const statusParam = searchParams.get("status") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limitParam = searchParams.get("limit") ?? undefined;
    const query = searchParams.get("q") ?? undefined;

    if (!serviceType) {
      return internalJson({ providers: [] });
    }

    const status = statusParam ? serviceProviderStatusSchema.parse(statusParam) : undefined;
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const limit = Number.isFinite(parsedLimit) && (parsedLimit as number) > 0 ? parsedLimit : undefined;

    if (status && (cursor !== undefined || limit !== undefined || query !== undefined)) {
      const page = await listInternalServiceProvidersPage(serviceType, status, {
        cursor,
        limit,
        query,
      });

      return internalJson(page);
    }

    const providers = await listInternalServiceProviders(serviceType, status);
    return internalJson({ providers });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải danh sách nhà cung cấp.", {
      route: "/api/internal/service-providers#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const input = serviceProviderMutationSchema.parse(await request.json());
    const provider = await createInternalServiceProvider(input);

    if (!provider) {
      return internalJson({ message: "Không thể tạo nhà cung cấp." }, { status: 500 });
    }

    await writeInternalAuditEvent({
      action: "create",
      actor: user,
      description: `Tạo nhà cung cấp ${provider.providerName}.`,
      entityId: provider.providerId,
      entityType: "service_provider",
      request,
    });

    return internalJson({ provider }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo nhà cung cấp.", {
      route: "/api/internal/service-providers#POST",
    });
  }
}
