import { unlink } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { archiveInternalDestination, findInternalDestination, hardDeleteInternalDestination, updateInternalDestination, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { destinationMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    destinationId: string;
  }>;
};

async function removeStoredFile(publicUrl: string | null | undefined) {
  if (!publicUrl) {
    return;
  }

  const relativePath = publicUrl.replace(/^\/+/, "");
  const fullPath = path.join(process.cwd(), "public", relativePath);
  const thumbPath = fullPath.replace(/-4k\.webp$/, "-thumb.webp");

  await Promise.all([
    unlink(fullPath).catch(() => undefined),
    unlink(thumbPath).catch(() => undefined),
  ]);
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { destinationId } = await context.params;
    const destination = await findInternalDestination(destinationId);

    if (!destination) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    return internalJson({ destination });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải địa điểm.", {
      route: "/api/internal/destinations/[destinationId]#GET",
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { destinationId } = await context.params;
    const input = destinationMutationSchema.parse(await request.json());
    const destination = await updateInternalDestination(destinationId, input, user.userId);

    if (!destination) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "update",
      actor: user,
      description: `Cập nhật địa điểm ${destination.name}.`,
      entityId: destination.destinationId,
      entityType: "destination",
      request,
    });

    return internalJson({ destination });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật địa điểm.", {
      route: "/api/internal/destinations/[destinationId]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { destinationId } = await context.params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    if (mode === "hard") {
      const deleted = await hardDeleteInternalDestination(destinationId);

      if (!deleted) {
        return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
      }

      await Promise.all(
        deleted.media.flatMap((media) => [
          removeStoredFile(media.mediaUrl),
          removeStoredFile(media.thumbnailUrl),
        ]),
      );

      await writeInternalAuditEvent({
        action: "hard_delete",
        actor: user,
        description: `Xóa vĩnh viễn địa điểm ${deleted.destination.name}.`,
        entityId: deleted.destination.destinationId,
        entityType: "destination",
        request,
      });

      return internalJson({
        destination: deleted.destination,
        message: "Địa điểm đã bị xóa vĩnh viễn.",
      });
    }

    const destination = await archiveInternalDestination(destinationId, user.userId);

    if (!destination) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "archive",
      actor: user,
      description: `Lưu trữ địa điểm ${destination.name}.`,
      entityId: destination.destinationId,
      entityType: "destination",
      request,
    });

    return internalJson({ destination });
  } catch (error) {
    return internalErrorResponse(error, "Không thể lưu trữ địa điểm.", {
      route: "/api/internal/destinations/[destinationId]#DELETE",
    });
  }
}
