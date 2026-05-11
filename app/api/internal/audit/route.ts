import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { listInternalAuditByActor, listInternalAuditByEntity } from "@/lib/server/internal-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") ?? "20", 10);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const options = {
      cursor: searchParams.get("cursor"),
      limit: Number.isFinite(limit) ? limit : undefined,
    };

    if (entityType && entityId) {
      return internalJson(await listInternalAuditByEntity(entityType, entityId, options));
    }

    return internalJson(await listInternalAuditByActor(user.userId, options));
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải audit log.", {
      route: "/api/internal/audit#GET",
    });
  }
}
