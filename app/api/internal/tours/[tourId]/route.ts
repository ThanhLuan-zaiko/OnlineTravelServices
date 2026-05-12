import { rm } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { archiveInternalTour, findInternalTour, hardDeleteInternalTour, updateInternalTour, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { syncPublicTourProjection } from "@/lib/server/public-tours";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { tourMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    tourId: string;
  }>;
};

async function removeStoredFile(publicUrl: string | null) {
  if (!publicUrl) {
    return;
  }

  await rm(path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, "")), { force: true });
}

async function removeTourFolder(tourId: string) {
  await rm(path.join(process.cwd(), "public", "uploads", "tours", tourId), { force: true, recursive: true });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const tour = await findInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    return internalJson({ tour });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải tour.", { route: "/api/internal/tours/[tourId]#GET" });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const input = tourMutationSchema.parse(await request.json());
    const tour = await updateInternalTour(tourId, input);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "update",
      actor: user,
      description: `Cập nhật tour ${tour.title}.`,
      entityId: tour.tourId,
      entityType: "tour",
      request,
    });
    await syncPublicTourProjection(tour.tourId);

    return internalJson({ tour });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật tour.", { route: "/api/internal/tours/[tourId]#PATCH" });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const { searchParams } = new URL(request.url);

    if (searchParams.get("mode") === "hard") {
      const deleted = await hardDeleteInternalTour(tourId);

      if (!deleted) {
        return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
      }

      await Promise.all([
        removeStoredFile(deleted.tour.coverImageUrl),
        ...deleted.media.flatMap((media) => [removeStoredFile(media.mediaUrl), removeStoredFile(media.thumbnailUrl)]),
      ]);
      await removeTourFolder(tourId);

      await writeInternalAuditEvent({
        action: "hard_delete",
        actor: user,
        description: `Xóa vĩnh viễn tour ${deleted.tour.title}.`,
        entityId: deleted.tour.tourId,
        entityType: "tour",
        request,
      });
      await syncPublicTourProjection(tourId);

      return internalJson({ message: "Tour đã bị xóa vĩnh viễn.", tour: deleted.tour });
    }

    const tour = await archiveInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "archive",
      actor: user,
      description: `Lưu trữ tour ${tour.title}.`,
      entityId: tour.tourId,
      entityType: "tour",
      request,
    });
    await syncPublicTourProjection(tour.tourId);

    return internalJson({ tour });
  } catch (error) {
    return internalErrorResponse(error, "Không thể lưu trữ tour.", { route: "/api/internal/tours/[tourId]#DELETE" });
  }
}
