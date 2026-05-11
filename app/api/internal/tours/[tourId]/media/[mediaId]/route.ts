import { unlink } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteTourMedia, findInternalTour, findTourMedia, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    mediaId: string;
    tourId: string;
  }>;
};

async function removeStoredFile(publicUrl: string) {
  const relativePath = publicUrl.replace(/^\/+/, "");
  const fullPath = path.join(process.cwd(), "public", relativePath);
  const thumbPath = fullPath.replace(/-4k\.webp$/, "-thumb.webp");

  await Promise.all([
    unlink(fullPath).catch(() => undefined),
    unlink(thumbPath).catch(() => undefined),
  ]);
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { mediaId, tourId } = await context.params;
    const tour = await findInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    const media = await findTourMedia(tourId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await removeStoredFile(media.mediaUrl);
    const deleted = await deleteTourMedia(tourId, mediaId);

    if (!deleted) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "media_delete",
      actor: user,
      description: `Xóa ảnh khỏi tour ${tour.title}.`,
      entityId: tour.tourId,
      entityType: "tour",
      request,
    });

    return internalJson({ media: deleted });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa ảnh tour.", {
      route: "/api/internal/tours/[tourId]/media/[mediaId]#DELETE",
    });
  }
}
