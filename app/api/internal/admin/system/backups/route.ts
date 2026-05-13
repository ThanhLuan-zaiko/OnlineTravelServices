import { requireSuperAdminStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createAdminSystemBackup, listAdminSystemBackups } from "@/lib/server/internal-admin";
import { adminBackupMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireSuperAdminStaff(request);
    const backups = await listAdminSystemBackups();

    return internalJson({ backups });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải backup hệ thống.", {
      route: "/api/internal/admin/system/backups#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSuperAdminStaff(request);
    const payload = adminBackupMutationSchema.parse(await request.json());
    const backup = await createAdminSystemBackup(payload, user, request);

    return internalJson({ backup }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo backup hệ thống.", {
      route: "/api/internal/admin/system/backups#POST",
    });
  }
}
