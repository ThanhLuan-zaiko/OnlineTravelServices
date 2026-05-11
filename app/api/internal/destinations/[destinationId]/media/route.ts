import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { addDestinationMedia, findInternalDestination, listDestinationMedia, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { storeImageAsset } from "@/lib/server/media-storage";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    destinationId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { destinationId } = await context.params;
    const destination = await findInternalDestination(destinationId);

    if (!destination) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    const media = await listDestinationMedia(destinationId);

    return internalJson({ media });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải media địa điểm.", {
      route: "/api/internal/destinations/[destinationId]/media#GET",
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { destinationId } = await context.params;
    const destination = await findInternalDestination(destinationId);

    if (!destination) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const isCover = formData.get("isCover") === "1";
    const mediaType = String(formData.get("mediaType") ?? "image");
    const titleValue = String(formData.get("title") ?? "").trim();

    if (!(file instanceof File)) {
      return internalJson({ fields: ["file"], message: "Vui lòng chọn ảnh." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeImageAsset({
      folder: ["destinations", destinationId],
      sourceBuffer: buffer,
      sourceName: file.name || "destination-image",
    });
    const media = await addDestinationMedia(destinationId, {
      mediaType,
      mediaUrl: stored.fullUrl,
      thumbnailUrl: stored.thumbnailUrl,
      title: titleValue.length > 0 ? titleValue : null,
      uploadedBy: user.userId,
      isCover,
    });

    if (media) {
      await writeInternalAuditEvent({
        action: isCover ? "media_cover_upload" : "media_upload",
        actor: user,
        description: `Upload ảnh cho địa điểm ${destination.name}.`,
        entityId: destination.destinationId,
        entityType: "destination",
        request,
      });
    }

    return internalJson({ media }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải ảnh địa điểm.", {
      route: "/api/internal/destinations/[destinationId]/media#POST",
    });
  }
}
