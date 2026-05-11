import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createInternalPromotion, listInternalPromotions, listInternalPromotionsPage, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { promotionMutationSchema, promotionStatusSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? undefined;
    const cursor = searchParams.get("cursor") ?? undefined;
    const limitParam = searchParams.get("limit") ?? undefined;
    const query = searchParams.get("q") ?? undefined;
    const status = statusParam ? promotionStatusSchema.parse(statusParam) : undefined;
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const limit = Number.isFinite(parsedLimit) && (parsedLimit as number) > 0 ? parsedLimit : undefined;

    if (status && (cursor !== undefined || limit !== undefined || query !== undefined)) {
      const page = await listInternalPromotionsPage(status, { cursor, limit, query });

      return internalJson(page);
    }

    const promotions = await listInternalPromotions(status);

    return internalJson({ promotions });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải danh sách khuyến mãi.", {
      route: "/api/internal/promotions#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const input = promotionMutationSchema.parse(await request.json());
    const promotion = await createInternalPromotion(input, user.userId);

    if (promotion) {
      await writeInternalAuditEvent({
        action: "create",
        actor: user,
        description: `Tạo khuyến mãi ${promotion.title}.`,
        entityId: promotion.promotionId,
        entityType: "promotion",
        request,
      });
    }

    return internalJson({ promotion }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo khuyến mãi.", {
      route: "/api/internal/promotions#POST",
    });
  }
}
