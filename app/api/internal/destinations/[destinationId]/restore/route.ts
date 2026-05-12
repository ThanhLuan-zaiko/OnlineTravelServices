import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { findInternalDestination, restoreInternalDestination, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { syncPublicToursForDestination } from "@/lib/server/public-tours";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    destinationId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { destinationId } = await context.params;
    const destination = await findInternalDestination(destinationId);

    if (!destination) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    const restored = await restoreInternalDestination(destinationId, user.userId);

    if (!restored) {
      return internalJson({ message: "Không thể khôi phục địa điểm." }, { status: 500 });
    }

    await writeInternalAuditEvent({
      action: "restore",
      actor: user,
      description: `Khôi phục địa điểm ${restored.name}.`,
      entityId: restored.destinationId,
      entityType: "destination",
      request,
    });
    await syncPublicToursForDestination(restored.destinationId);

    return internalJson({ destination: restored });
  } catch (error) {
    return internalErrorResponse(error, "Không thể khôi phục địa điểm.", {
      route: "/api/internal/destinations/[destinationId]/restore#PATCH",
    });
  }
}
