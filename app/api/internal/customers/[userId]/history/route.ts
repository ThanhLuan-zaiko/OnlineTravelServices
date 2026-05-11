import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { findInternalCustomer, listCustomerHistory } from "@/lib/server/internal-data";

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

    return internalJson({ history: await listCustomerHistory(userId) });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải lịch sử khách hàng.", {
      route: "/api/internal/customers/[userId]/history#GET",
    });
  }
}
