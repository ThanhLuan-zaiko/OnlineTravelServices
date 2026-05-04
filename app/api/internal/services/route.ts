import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createInternalService, listInternalDestinations, listInternalServices } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { serviceCatalogMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const destinationId = searchParams.get("destinationId")?.trim();

    if (!destinationId) {
      return internalJson({ destinations: [], services: [] });
    }

    const [services, destinations] = await Promise.all([
      listInternalServices(destinationId),
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
    await requireAdministrativeStaff(request);
    const input = serviceCatalogMutationSchema.parse(await request.json());
    const service = await createInternalService(input);

    if (!service) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    return internalJson({ service }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo dịch vụ.", {
      route: "/api/internal/services#POST",
    });
  }
}
