import { rm } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  archiveInternalPromotion,
  findInternalPromotion,
  hardDeleteInternalPromotion,
  updateInternalPromotion,
  writeInternalAuditEvent,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { promotionMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    promotionId: string;
  }>;
};

async function removeStoredFile(publicUrl: string | null) {
  if (!publicUrl) {
    return;
  }

  await rm(path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, "")), { force: true });
}

async function removePromotionFolder(promotionId: string) {
  await rm(path.join(process.cwd(), "public", "uploads", "promotions", promotionId), { force: true, recursive: true });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { promotionId } = await context.params;
    const promotion = await findInternalPromotion(promotionId);

    if (!promotion) {
      return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
    }

    return internalJson({ promotion });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải khuyến mãi.", {
      route: "/api/internal/promotions/[promotionId]#GET",
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { promotionId } = await context.params;
    const input = promotionMutationSchema.parse(await request.json());
    const promotion = await updateInternalPromotion(promotionId, input);

    if (!promotion) {
      return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "update",
      actor: user,
      description: `Cập nhật khuyến mãi ${promotion.title}.`,
      entityId: promotion.promotionId,
      entityType: "promotion",
      request,
    });

    return internalJson({ promotion });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật khuyến mãi.", {
      route: "/api/internal/promotions/[promotionId]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { promotionId } = await context.params;
    const { searchParams } = new URL(request.url);

    if (searchParams.get("mode") === "hard") {
      const deleted = await hardDeleteInternalPromotion(promotionId);

      if (!deleted) {
        return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
      }

      await Promise.all([
        removeStoredFile(deleted.promotion.imageUrl),
        removeStoredFile(deleted.promotion.thumbnailUrl),
        ...deleted.media.flatMap((media) => [removeStoredFile(media.mediaUrl), removeStoredFile(media.thumbnailUrl)]),
      ]);
      await removePromotionFolder(promotionId);

      await writeInternalAuditEvent({
        action: "hard_delete",
        actor: user,
        description: `Xóa vĩnh viễn khuyến mãi ${deleted.promotion.title}.`,
        entityId: deleted.promotion.promotionId,
        entityType: "promotion",
        request,
      });

      return internalJson({ message: "Khuyến mãi đã bị xóa vĩnh viễn.", promotion: deleted.promotion });
    }

    const promotion = await archiveInternalPromotion(promotionId);

    if (!promotion) {
      return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "archive",
      actor: user,
      description: `Lưu trữ khuyến mãi ${promotion.title}.`,
      entityId: promotion.promotionId,
      entityType: "promotion",
      request,
    });

    return internalJson({ promotion });
  } catch (error) {
    return internalErrorResponse(error, "Không thể lưu trữ khuyến mãi.", {
      route: "/api/internal/promotions/[promotionId]#DELETE",
    });
  }
}
