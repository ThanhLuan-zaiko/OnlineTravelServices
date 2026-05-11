import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { restoreInternalPromotion, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    promotionId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { promotionId } = await context.params;
    const promotion = await restoreInternalPromotion(promotionId);

    if (!promotion) {
      return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "restore",
      actor: user,
      description: `Khôi phục khuyến mãi ${promotion.title}.`,
      entityId: promotion.promotionId,
      entityType: "promotion",
      request,
    });

    return internalJson({ promotion });
  } catch (error) {
    return internalErrorResponse(error, "Không thể khôi phục khuyến mãi.", {
      route: "/api/internal/promotions/[promotionId]/restore#PATCH",
    });
  }
}
