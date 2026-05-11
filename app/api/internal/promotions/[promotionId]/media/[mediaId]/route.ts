import { rm } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deletePromotionMedia, findInternalPromotion, findPromotionMedia, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    mediaId: string;
    promotionId: string;
  }>;
};

async function removeStoredFile(publicUrl: string) {
  await rm(path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, "")), { force: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { mediaId, promotionId } = await context.params;
    const promotion = await findInternalPromotion(promotionId);

    if (!promotion) {
      return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
    }

    const media = await findPromotionMedia(promotionId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await Promise.all([removeStoredFile(media.mediaUrl), removeStoredFile(media.thumbnailUrl)]);
    const deleted = await deletePromotionMedia(promotionId, mediaId);

    if (!deleted) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "media_delete",
      actor: user,
      description: `Xóa ảnh khỏi khuyến mãi ${promotion.title}.`,
      entityId: promotion.promotionId,
      entityType: "promotion",
      request,
    });

    return internalJson({ media: deleted });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa ảnh khuyến mãi.", {
      route: "/api/internal/promotions/[promotionId]/media/[mediaId]#DELETE",
    });
  }
}
