import { requireSuperAdminStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createAdminSystemTask, listAdminSystemTasks } from "@/lib/server/internal-admin";
import { adminSystemTaskMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireSuperAdminStaff(request);
    const tasks = await listAdminSystemTasks();

    return internalJson({ tasks });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải task hệ thống.", {
      route: "/api/internal/admin/system/tasks#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSuperAdminStaff(request);
    const payload = adminSystemTaskMutationSchema.parse(await request.json());
    const task = await createAdminSystemTask(payload, user, request);

    return internalJson({ task }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo task hệ thống.", {
      route: "/api/internal/admin/system/tasks#POST",
    });
  }
}
