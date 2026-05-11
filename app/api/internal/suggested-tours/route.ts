import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createSuggestedTour, listSuggestedToursPage, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { suggestedTourMutationSchema, suggestedTourStatusSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const status = suggestedTourStatusSchema.parse(searchParams.get("status") ?? "pending");
    const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10);
    const suggestions = await listSuggestedToursPage(status, {
      cursor: searchParams.get("cursor"),
      limit: Number.isFinite(limit) ? limit : undefined,
      query: searchParams.get("q") ?? undefined,
    });

    return internalJson(suggestions);
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải danh sách tour đề xuất.", {
      route: "/api/internal/suggested-tours#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const input = suggestedTourMutationSchema.parse(await request.json());
    const suggestion = await createSuggestedTour(input);

    if (!suggestion) {
      return internalJson({ message: "Không thể tạo tour đề xuất." }, { status: 500 });
    }

    await writeInternalAuditEvent({
      action: "create",
      actor: user,
      description: `Tạo tour đề xuất ${suggestion.title}.`,
      entityId: suggestion.suggestionId,
      entityType: "suggested_tour",
      request,
    });

    return internalJson({ suggestion }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo tour đề xuất.", {
      route: "/api/internal/suggested-tours#POST",
    });
  }
}
