import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createInternalVehicleCatalog, listInternalVehicleCatalog, listInternalVehicleCatalogPage } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { vehicleCatalogMutationSchema, vehicleCatalogStatusSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limitParam = searchParams.get("limit") ?? undefined;
    const query = searchParams.get("q") ?? undefined;
    const status = statusParam ? vehicleCatalogStatusSchema.parse(statusParam) : undefined;
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const limit = Number.isFinite(parsedLimit) && (parsedLimit as number) > 0 ? parsedLimit : undefined;

    if (cursor !== undefined || limit !== undefined || query !== undefined) {
      const page = await listInternalVehicleCatalogPage(status, {
        cursor,
        limit,
        query,
      });

      return internalJson(page);
    }

    const catalog = await listInternalVehicleCatalog(status);

    return internalJson({ catalog });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải danh mục phương tiện.", {
      route: "/api/internal/vehicle-catalog#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const input = vehicleCatalogMutationSchema.parse(await request.json());
    const catalogItem = await createInternalVehicleCatalog(input);

    if (!catalogItem) {
      return internalJson({ message: "Không thể tạo phương tiện." }, { status: 500 });
    }

    return internalJson({ catalogItem }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo phương tiện.", {
      route: "/api/internal/vehicle-catalog#POST",
    });
  }
}
