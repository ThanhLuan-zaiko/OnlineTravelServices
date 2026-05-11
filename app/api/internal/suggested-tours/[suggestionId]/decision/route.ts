import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  createStaffNotification,
  decideSuggestedTour,
  findSuggestedTour,
  writeInternalAuditEvent,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { suggestedTourDecisionRequestSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    suggestionId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { suggestionId } = await context.params;
    const existing = await findSuggestedTour(suggestionId);

    if (!existing) {
      return internalJson({ message: "Không tìm thấy tour đề xuất." }, { status: 404 });
    }

    const input = suggestedTourDecisionRequestSchema.parse(await request.json());

    if (input.decision === "converted" && !existing.destinationId) {
      return internalJson({ fields: ["destinationId"], message: "Cần Destination ID trước khi chuyển thành tour." }, { status: 400 });
    }

    const suggestion = await decideSuggestedTour(suggestionId, input, user.userId);

    if (!suggestion) {
      return internalJson({ message: "Không tìm thấy tour đề xuất." }, { status: 404 });
    }

    await Promise.all([
      writeInternalAuditEvent({
        action: input.decision,
        actor: user,
        description: `Quyết định tour đề xuất ${suggestion.title}: ${input.decision}.`,
        entityId: suggestion.suggestionId,
        entityType: "suggested_tour",
        request,
      }),
      createStaffNotification({
        body: input.decisionNote,
        entityId: suggestion.suggestionId,
        entityLabel: suggestion.title,
        entityType: "suggested_tour",
        notificationType: "suggested_tour_decision",
        staffId: user.userId,
        title: `Tour đề xuất ${input.decision}`,
      }),
    ]);

    return internalJson({ suggestion });
  } catch (error) {
    return internalErrorResponse(error, "Không thể ghi quyết định tour đề xuất.", {
      route: "/api/internal/suggested-tours/[suggestionId]/decision#POST",
    });
  }
}
