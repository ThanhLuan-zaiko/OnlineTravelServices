import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createInternalPromotion, listInternalPromotions } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { promotionMutationSchema, promotionStatusSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? undefined;
    const status = statusParam ? promotionStatusSchema.parse(statusParam) : undefined;
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

    return internalJson({ promotion }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo khuyến mãi.", {
      route: "/api/internal/promotions#POST",
    });
  }
}
