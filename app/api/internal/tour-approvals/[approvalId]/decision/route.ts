import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  createStaffNotification,
  decideTourApproval,
  writeInternalAuditEvent,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { tourApprovalDecisionRequestSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    approvalId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { approvalId } = await context.params;
    const input = tourApprovalDecisionRequestSchema.parse(await request.json());
    const approval = await decideTourApproval(approvalId, input, user.userId);

    if (!approval) {
      return internalJson({ message: "Không tìm thấy yêu cầu phê duyệt." }, { status: 404 });
    }

    await Promise.all([
      writeInternalAuditEvent({
        action: input.decision,
        actor: user,
        description: `Duyệt yêu cầu tour ${approval.tourTitle}: ${input.decision}.`,
        entityId: approval.approvalId,
        entityType: "tour_approval",
        request,
      }),
      createStaffNotification({
        body: input.reviewNote,
        entityId: approval.approvalId,
        entityLabel: approval.tourTitle,
        entityType: "tour_approval",
        notificationType: "tour_approval_decision",
        staffId: user.userId,
        title: `Phê duyệt tour ${input.decision}`,
      }),
    ]);

    return internalJson({ approval });
  } catch (error) {
    return internalErrorResponse(error, "Không thể ghi quyết định phê duyệt.", {
      route: "/api/internal/tour-approvals/[approvalId]/decision#POST",
    });
  }
}
