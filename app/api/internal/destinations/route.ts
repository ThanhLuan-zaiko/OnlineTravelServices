import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createInternalDestination, listInternalDestinations, listInternalDestinationsPage, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { destinationStatusSchema, destinationMutationSchema } from "@/lib/shared/internal";

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
    const status = statusParam ? destinationStatusSchema.parse(statusParam) : undefined;
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const limit = Number.isFinite(parsedLimit) && (parsedLimit as number) > 0 ? parsedLimit : undefined;

    if (cursor !== undefined || limit !== undefined || query !== undefined) {
      const page = await listInternalDestinationsPage(
        status ?? "published",
        {
          cursor,
          limit,
          query,
        },
      );

      return internalJson(page);
    }

    const destinations = await listInternalDestinations(status);

    return internalJson({ destinations });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải danh sách địa điểm.", {
      route: "/api/internal/destinations#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const input = destinationMutationSchema.parse(await request.json());
    const destination = await createInternalDestination(input, user.userId);

    if (!destination) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "create",
      actor: user,
      description: `Tạo địa điểm ${destination.name}.`,
      entityId: destination.destinationId,
      entityType: "destination",
      request,
    });

    return internalJson({ destination }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo địa điểm.", {
      route: "/api/internal/destinations#POST",
    });
  }
}
