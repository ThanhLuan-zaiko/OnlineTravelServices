import { requireSuperAdminStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { updateAdminSystemTaskStatus } from "@/lib/server/internal-admin";
import { adminSystemTaskStatusMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    taskId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireSuperAdminStaff(request);
    const { taskId } = await context.params;
    const payload = adminSystemTaskStatusMutationSchema.parse(await request.json());
    const task = await updateAdminSystemTaskStatus(taskId, payload, user, request);

    return internalJson({ task });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật task hệ thống.", {
      route: "/api/internal/admin/system/tasks/[taskId]#PATCH",
    });
  }
}
