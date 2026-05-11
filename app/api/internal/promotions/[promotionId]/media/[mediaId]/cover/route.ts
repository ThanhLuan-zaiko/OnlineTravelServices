import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { findInternalPromotion, findPromotionMedia, setPromotionMediaCover, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    mediaId: string;
    promotionId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { mediaId, promotionId } = await context.params;
    const promotion = await findInternalPromotion(promotionId);

    if (!promotion) {
      return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
    }

    const existing = await findPromotionMedia(promotionId, mediaId);

    if (!existing) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    const media = await setPromotionMediaCover(promotionId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "media_cover",
      actor: user,
      description: `Đặt ảnh đại diện cho khuyến mãi ${promotion.title}.`,
      entityId: promotion.promotionId,
      entityType: "promotion",
      request,
    });

    return internalJson({ media });
  } catch (error) {
    return internalErrorResponse(error, "Không thể đặt ảnh đại diện khuyến mãi.", {
      route: "/api/internal/promotions/[promotionId]/media/[mediaId]/cover#PATCH",
    });
  }
}
