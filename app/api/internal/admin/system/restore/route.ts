import { requireSuperAdminStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { restoreAdminSystemBackup } from "@/lib/server/internal-admin";
import { adminRestoreMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireSuperAdminStaff(request);
    const payload = adminRestoreMutationSchema.parse(await request.json());
    const backup = await restoreAdminSystemBackup(payload, user, request);

    return internalJson({ backup });
  } catch (error) {
    return internalErrorResponse(error, "Không thể khôi phục dữ liệu.", {
      route: "/api/internal/admin/system/restore#POST",
    });
  }
}
