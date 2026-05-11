import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  addCustomerReward,
  findInternalCustomer,
  listCustomerRewards,
  writeInternalAuditEvent,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { customerRewardMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { userId } = await context.params;
    const customer = await findInternalCustomer(userId);

    if (!customer) {
      return internalJson({ message: "Không tìm thấy khách hàng." }, { status: 404 });
    }

    return internalJson({ rewards: await listCustomerRewards(userId) });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải quà tặng khách hàng.", {
      route: "/api/internal/customers/[userId]/rewards#GET",
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { userId } = await context.params;
    const input = customerRewardMutationSchema.parse(await request.json());
    const reward = await addCustomerReward(userId, input);

    if (!reward) {
      return internalJson({ message: "Không tìm thấy khách hàng." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "assign_reward",
      actor: user,
      description: `Gán quà tặng ${reward.title} cho khách hàng.`,
      entityId: userId,
      entityType: "customer",
      request,
    });

    return internalJson({ reward }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể gán quà tặng khách hàng.", {
      route: "/api/internal/customers/[userId]/rewards#POST",
    });
  }
}
