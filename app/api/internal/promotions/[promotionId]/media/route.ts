import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { addPromotionMedia, findInternalPromotion, listPromotionMedia, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    promotionId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { promotionId } = await context.params;
    const promotion = await findInternalPromotion(promotionId);

    if (!promotion) {
      return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
    }

    const media = await listPromotionMedia(promotionId);

    return internalJson({ media });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải ảnh khuyến mãi.", {
      route: "/api/internal/promotions/[promotionId]/media#GET",
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { promotionId } = await context.params;
    const promotion = await findInternalPromotion(promotionId);

    if (!promotion) {
      return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll("files").filter((file): file is File => file instanceof File);
    const fallbackFile = formData.get("file");
    const uploadFiles = files.length > 0 ? files : fallbackFile instanceof File ? [fallbackFile] : [];
    const isCover = formData.get("isCover") === "1";
    const titleValue = String(formData.get("title") ?? "").trim();

    if (uploadFiles.length === 0) {
      return internalJson({ fields: ["files"], message: "Vui lòng chọn ảnh." }, { status: 400 });
    }

    const media = [];

    for (const [index, file] of uploadFiles.entries()) {
      const item = await addPromotionMedia(promotionId, {
        isCover: isCover && index === 0,
        sourceBuffer: Buffer.from(await file.arrayBuffer()),
        sourceName: file.name,
        title: titleValue.length > 0 ? titleValue : null,
        uploadedBy: user.userId,
      });

      if (item) {
        media.push(item);
      }
    }

    if (media.length > 0) {
      await writeInternalAuditEvent({
        action: isCover ? "media_cover_upload" : "media_upload",
        actor: user,
        description: `Upload ${media.length} ảnh cho khuyến mãi ${promotion.title}.`,
        entityId: promotion.promotionId,
        entityType: "promotion",
        request,
      });
    }

    return internalJson({ media }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể upload ảnh khuyến mãi.", {
      route: "/api/internal/promotions/[promotionId]/media#POST",
    });
  }
}
