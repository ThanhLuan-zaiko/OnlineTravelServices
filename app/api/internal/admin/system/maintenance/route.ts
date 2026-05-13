import { requireSuperAdminStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { runAdminMaintenance } from "@/lib/server/internal-admin";
import { adminMaintenanceMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireSuperAdminStaff(request);
    const payload = adminMaintenanceMutationSchema.parse(await request.json());
    const result = await runAdminMaintenance(payload, user, request);

    return internalJson(result);
  } catch (error) {
    return internalErrorResponse(error, "Không thể chạy bảo trì hệ thống.", {
      route: "/api/internal/admin/system/maintenance#POST",
    });
  }
}
