import { requireOperationsAccess } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  createOperationTrendSnapshot,
  listOperationTrendSnapshots,
  writeInternalAuditEvent,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import {
  operationTrendAnalysisTypeSchema,
  operationTrendSnapshotMutationSchema,
} from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireOperationsAccess(request);
    const { searchParams } = new URL(request.url);
    const analysisType = operationTrendAnalysisTypeSchema.parse(searchParams.get("analysisType") ?? "customer_trend");
    const cursor = searchParams.get("cursor");
    const snapshots = await listOperationTrendSnapshots({ analysisType, cursor });

    return internalJson(snapshots);
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải phân tích xu hướng.", {
      route: "/api/internal/operations/trends#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireOperationsAccess(request);
    const payload = operationTrendSnapshotMutationSchema.parse(await request.json());
    const snapshot = await createOperationTrendSnapshot({ actorUserId: user.userId, payload });

    await writeInternalAuditEvent({
      action: "operation_trend_snapshot",
      actor: user,
      description: `Lưu phân tích xu hướng ${snapshot.title}.`,
      entityId: snapshot.snapshotId,
      entityType: "trend_analysis",
      request,
    });

    return internalJson({ snapshot }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể lưu phân tích xu hướng.", {
      route: "/api/internal/operations/trends#POST",
    });
  }
}
