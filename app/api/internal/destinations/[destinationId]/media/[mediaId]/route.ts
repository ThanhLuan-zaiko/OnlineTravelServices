import { unlink } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteDestinationMedia, findDestinationMedia, findInternalDestination, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    destinationId: string;
    mediaId: string;
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
    const { destinationId, mediaId } = await context.params;
    const destination = await findInternalDestination(destinationId);

    if (!destination) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    const media = await findDestinationMedia(destinationId, mediaId);

    if (!media) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await removeStoredFile(media.mediaUrl);
    const deleted = await deleteDestinationMedia(destinationId, mediaId);

    if (!deleted) {
      return internalJson({ message: "Không tìm thấy ảnh." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "media_delete",
      actor: user,
      description: `Xóa ảnh khỏi địa điểm ${destination.name}.`,
      entityId: destination.destinationId,
      entityType: "destination",
      request,
    });

    return internalJson({ media: deleted });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa ảnh địa điểm.", {
      route: "/api/internal/destinations/[destinationId]/media/[mediaId]#DELETE",
    });
  }
}
