import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { findTourApproval } from "@/lib/server/internal-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    approvalId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { approvalId } = await context.params;
    const approval = await findTourApproval(approvalId);

    if (!approval) {
      return internalJson({ message: "Không tìm thấy yêu cầu phê duyệt." }, { status: 404 });
    }

    return internalJson({ approval });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải yêu cầu phê duyệt.", {
      route: "/api/internal/tour-approvals/[approvalId]#GET",
    });
  }
}
