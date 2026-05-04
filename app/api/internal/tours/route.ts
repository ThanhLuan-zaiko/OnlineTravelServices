import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createInternalTour, listInternalTours } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { tourMutationSchema, tourStatusSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") ?? undefined;
    const status = statusParam ? tourStatusSchema.parse(statusParam) : undefined;
    const tours = await listInternalTours(status);

    return internalJson({ tours });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải danh sách tour.", { route: "/api/internal/tours#GET" });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const input = tourMutationSchema.parse(await request.json());
    const tour = await createInternalTour(input, user.userId);

    return internalJson({ tour }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo tour.", { route: "/api/internal/tours#POST" });
  }
}
