import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { addTourMedia, findInternalTour, listTourMedia, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { storeImageAsset } from "@/lib/server/media-storage";
import { assertSameOriginRequest } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    tourId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const tour = await findInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    const media = await listTourMedia(tourId);
    return internalJson({ media });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải ảnh tour.", {
      route: "/api/internal/tours/[tourId]/media#GET",
    });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { tourId } = await context.params;
    const tour = await findInternalTour(tourId);

    if (!tour) {
      return internalJson({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const isCover = formData.get("isCover") === "1";
    const mediaType = String(formData.get("mediaType") ?? "image");
    const title = String(formData.get("title") ?? "").trim();

    if (!(file instanceof File)) {
      return internalJson({ fields: ["file"], message: "Vui lòng chọn ảnh." }, { status: 400 });
    }

    const stored = await storeImageAsset({
      folder: ["tours", tourId],
      sourceBuffer: Buffer.from(await file.arrayBuffer()),
      sourceName: file.name || "tour-image",
    });

    const media = await addTourMedia(tourId, {
      isCover,
      mediaType,
      mediaUrl: stored.fullUrl,
      thumbnailUrl: stored.thumbnailUrl,
      title: title.length > 0 ? title : null,
      uploadedBy: user.userId,
    });

    if (media) {
      await writeInternalAuditEvent({
        action: isCover ? "media_cover_upload" : "media_upload",
        actor: user,
        description: `Upload ảnh cho tour ${tour.title}.`,
        entityId: tour.tourId,
        entityType: "tour",
        request,
      });
    }

    return internalJson({ media }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải ảnh tour.", {
      route: "/api/internal/tours/[tourId]/media#POST",
    });
  }
}
