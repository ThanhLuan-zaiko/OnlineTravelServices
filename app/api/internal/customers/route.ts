import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { listInternalCustomers } from "@/lib/server/internal-data";
import { customerListModeSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") ?? "12", 10);
    const mode = customerListModeSchema.parse(searchParams.get("mode") ?? "status");
    const page = await listInternalCustomers({
      cursor: searchParams.get("cursor"),
      limit: Number.isFinite(limit) ? limit : undefined,
      mode,
      query: searchParams.get("q") ?? undefined,
      value: searchParams.get("value") ?? undefined,
    });

    return internalJson(page);
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải danh sách khách hàng.", {
      route: "/api/internal/customers#GET",
    });
  }
}
