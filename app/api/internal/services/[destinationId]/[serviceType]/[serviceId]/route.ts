import { rm } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { deleteInternalService, findInternalService, hardDeleteInternalService, updateInternalService, writeInternalAuditEvent } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { serviceCatalogMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    destinationId: string;
    serviceId: string;
    serviceType: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { destinationId, serviceId, serviceType } = await context.params;
    const service = await findInternalService(destinationId, serviceType, serviceId);

    if (!service) {
      return internalJson({ message: "Không tìm thấy dịch vụ." }, { status: 404 });
    }

    return internalJson({ service });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải dịch vụ.", {
      route: "/api/internal/services/[destinationId]/[serviceType]/[serviceId]#GET",
    });
  }
}

async function removeStoredFile(publicUrl: string | null) {
  if (!publicUrl) {
    return;
  }

  await rm(path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, "")), { force: true });
}

async function removeServiceFolder(destinationId: string, serviceType: string, serviceId: string) {
  await rm(path.join(process.cwd(), "public", "uploads", "services", destinationId, serviceType, serviceId), {
    force: true,
    recursive: true,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { destinationId, serviceId, serviceType } = await context.params;
    const input = serviceCatalogMutationSchema.parse(await request.json());
    const service = await updateInternalService(destinationId, serviceType, serviceId, input);

    if (!service) {
      return internalJson({ message: "Không tìm thấy dịch vụ." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "update",
      actor: user,
      description: `Cập nhật dịch vụ ${service.name}.`,
      entityId: service.serviceId,
      entityType: "service",
      request,
    });

    return internalJson({ service });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật dịch vụ.", {
      route: "/api/internal/services/[destinationId]/[serviceType]/[serviceId]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { destinationId, serviceId, serviceType } = await context.params;
    const { searchParams } = new URL(request.url);

    if (searchParams.get("mode") === "hard") {
      const deleted = await hardDeleteInternalService(destinationId, serviceType, serviceId);

      if (!deleted) {
        return internalJson({ message: "Không tìm thấy dịch vụ." }, { status: 404 });
      }

      await Promise.all([
        removeStoredFile(deleted.service.imageUrl),
        removeStoredFile(deleted.service.thumbnailUrl),
        ...deleted.media.flatMap((media) => [removeStoredFile(media.mediaUrl), removeStoredFile(media.thumbnailUrl)]),
      ]);
      await removeServiceFolder(destinationId, serviceType, serviceId);

      await writeInternalAuditEvent({
        action: "hard_delete",
        actor: user,
        description: `Xóa vĩnh viễn dịch vụ ${deleted.service.name}.`,
        entityId: deleted.service.serviceId,
        entityType: "service",
        request,
      });

      return internalJson({ message: "Dịch vụ đã bị xóa vĩnh viễn.", service: deleted.service });
    }

    const service = await deleteInternalService(destinationId, serviceType, serviceId);

    if (!service) {
      return internalJson({ message: "Không tìm thấy dịch vụ." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "archive",
      actor: user,
      description: `Lưu trữ dịch vụ ${service.name}.`,
      entityId: service.serviceId,
      entityType: "service",
      request,
    });

    return internalJson({ service });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa dịch vụ.", {
      route: "/api/internal/services/[destinationId]/[serviceType]/[serviceId]#DELETE",
    });
  }
}
