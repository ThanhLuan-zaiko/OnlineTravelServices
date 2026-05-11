import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  createTourApproval,
  listTourApprovalsPage,
  writeInternalAuditEvent,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { tourApprovalMutationSchema, tourApprovalStatusSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const status = tourApprovalStatusSchema.parse(searchParams.get("status") ?? "pending");
    const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10);
    const approvals = await listTourApprovalsPage(status, {
      cursor: searchParams.get("cursor"),
      limit: Number.isFinite(limit) ? limit : undefined,
      query: searchParams.get("q") ?? undefined,
    });

    return internalJson(approvals);
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải danh sách phê duyệt tour.", {
      route: "/api/internal/tour-approvals#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const input = tourApprovalMutationSchema.parse(await request.json());
    const approval = await createTourApproval(input, user.userId);

    if (!approval) {
      return internalJson({ message: "Không thể tạo yêu cầu phê duyệt." }, { status: 500 });
    }

    await writeInternalAuditEvent({
      action: "create",
      actor: user,
      description: `Tạo yêu cầu phê duyệt tour ${approval.tourTitle}.`,
      entityId: approval.approvalId,
      entityType: "tour_approval",
      request,
    });

    return internalJson({ approval }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo yêu cầu phê duyệt tour.", {
      route: "/api/internal/tour-approvals#POST",
    });
  }
}
