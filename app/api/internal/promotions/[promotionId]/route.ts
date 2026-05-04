import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  archiveInternalPromotion,
  findInternalPromotion,
  updateInternalPromotion,
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
    await requireAdministrativeStaff(request);
    const { promotionId } = await context.params;
    const input = promotionMutationSchema.parse(await request.json());
    const promotion = await updateInternalPromotion(promotionId, input);

    if (!promotion) {
      return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
    }

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
    await requireAdministrativeStaff(request);
    const { promotionId } = await context.params;
    const promotion = await archiveInternalPromotion(promotionId);

    if (!promotion) {
      return internalJson({ message: "Không tìm thấy khuyến mãi." }, { status: 404 });
    }

    return internalJson({ promotion });
  } catch (error) {
    return internalErrorResponse(error, "Không thể lưu trữ khuyến mãi.", {
      route: "/api/internal/promotions/[promotionId]#DELETE",
    });
  }
}
