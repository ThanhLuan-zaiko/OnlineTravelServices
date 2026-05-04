import { z } from "zod";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteItineraryItem, upsertItineraryItem } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { itineraryMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const positiveIntegerSchema = z.coerce.number().int().positive();

type RouteContext = {
  params: Promise<{
    dayNumber: string;
    itemOrder: string;
    tourId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const input = itineraryMutationSchema.parse(await request.json());
    const item = await upsertItineraryItem(tourId, input);

    return internalJson({ item });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật lịch trình tour.", {
      route: "/api/internal/tours/[tourId]/itinerary/[dayNumber]/[itemOrder]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    await requireAdministrativeStaff(request);
    const { dayNumber, itemOrder, tourId } = await context.params;

    await deleteItineraryItem(
      tourId,
      positiveIntegerSchema.parse(dayNumber),
      positiveIntegerSchema.parse(itemOrder),
    );

    return internalJson({ message: "Đã xóa mục lịch trình." });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa mục lịch trình.", {
      route: "/api/internal/tours/[tourId]/itinerary/[dayNumber]/[itemOrder]#DELETE",
    });
  }
}
