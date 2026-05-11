import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createInternalService, listInternalDestinations, listInternalServices, listInternalServicesPage, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { serviceCatalogMutationSchema, serviceStatusSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const destinationId = searchParams.get("destinationId")?.trim();
    const statusParam = searchParams.get("status") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limitParam = searchParams.get("limit") ?? undefined;
    const query = searchParams.get("q") ?? undefined;

    if (!destinationId) {
      return internalJson({ destinations: [], services: [] });
    }

    const status = statusParam ? serviceStatusSchema.parse(statusParam) : undefined;
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const limit = Number.isFinite(parsedLimit) && (parsedLimit as number) > 0 ? parsedLimit : undefined;

    if (status && (cursor !== undefined || limit !== undefined || query !== undefined)) {
      const page = await listInternalServicesPage(destinationId, status, { cursor, limit, query });

      return internalJson(page);
    }

    const [services, destinations] = await Promise.all([
      listInternalServices(destinationId, status),
      listInternalDestinations(),
    ]);

    return internalJson({
      destinations,
      services,
    });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải dịch vụ.", {
      route: "/api/internal/services#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const input = serviceCatalogMutationSchema.parse(await request.json());
    const service = await createInternalService(input);

    if (!service) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "create",
      actor: user,
      description: `Tạo dịch vụ ${service.name}.`,
      entityId: service.serviceId,
      entityType: "service",
      request,
    });

    return internalJson({ service }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo dịch vụ.", {
      route: "/api/internal/services#POST",
    });
  }
}
