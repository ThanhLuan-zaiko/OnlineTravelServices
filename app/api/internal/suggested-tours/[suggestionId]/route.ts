import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { findSuggestedTour, updateSuggestedTour, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { suggestedTourMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    suggestionId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { suggestionId } = await context.params;
    const suggestion = await findSuggestedTour(suggestionId);

    if (!suggestion) {
      return internalJson({ message: "Không tìm thấy tour đề xuất." }, { status: 404 });
    }

    return internalJson({ suggestion });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải tour đề xuất.", {
      route: "/api/internal/suggested-tours/[suggestionId]#GET",
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { suggestionId } = await context.params;
    const input = suggestedTourMutationSchema.parse(await request.json());
    const suggestion = await updateSuggestedTour(suggestionId, input);

    if (!suggestion) {
      return internalJson({ message: "Không tìm thấy tour đề xuất." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "update",
      actor: user,
      description: `Cập nhật tour đề xuất ${suggestion.title}.`,
      entityId: suggestion.suggestionId,
      entityType: "suggested_tour",
      request,
    });

    return internalJson({ suggestion });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật tour đề xuất.", {
      route: "/api/internal/suggested-tours/[suggestionId]#PATCH",
    });
  }
}
