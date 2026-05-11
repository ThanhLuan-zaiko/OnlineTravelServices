import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { updateCustomerTier, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { customerTierMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { userId } = await context.params;
    const input = customerTierMutationSchema.parse(await request.json());
    const customer = await updateCustomerTier(userId, input);

    if (!customer) {
      return internalJson({ message: "Không tìm thấy khách hàng." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "update_tier",
      actor: user,
      description: `Cập nhật phân loại ${customer.fullName}: ${customer.customerTier}/${customer.vipTier}.`,
      entityId: userId,
      entityType: "customer",
      request,
    });

    return internalJson({ customer });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật phân loại khách hàng.", {
      route: "/api/internal/customers/[userId]/tier#PATCH",
    });
  }
}
