import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createInternalTour, listInternalTours, listInternalToursPage } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { tourMutationSchema, tourStatusSchema } from "@/lib/shared/internal";

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
    const status = statusParam ? tourStatusSchema.parse(statusParam) : undefined;
    const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const limit = Number.isFinite(parsedLimit) && (parsedLimit as number) > 0 ? parsedLimit : undefined;

    if (status && (cursor !== undefined || limit !== undefined || query !== undefined)) {
      const page = await listInternalToursPage(status, { cursor, limit, query });

      return internalJson(page);
    }

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
