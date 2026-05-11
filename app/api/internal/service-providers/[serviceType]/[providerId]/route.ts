import { rm } from "node:fs/promises";
import path from "node:path";

import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import {
  deleteInternalServiceProvider,
  findInternalServiceProviderById,
  hardDeleteInternalServiceProvider,
  updateInternalServiceProvider,
  writeInternalAuditEvent,
} from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { serviceProviderMutationSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    providerId: string;
    serviceType: string;
  }>;
};

function toAbsolutePublicPath(publicUrl: string) {
  return path.join(process.cwd(), "public", publicUrl.replace(/^\/+/, ""));
}

async function removeStoredFile(publicUrl: string | null) {
  if (!publicUrl) {
    return;
  }

  await rm(toAbsolutePublicPath(publicUrl), { force: true });
}

async function removeProviderFolder(serviceType: string, providerId: string) {
  await rm(path.join(process.cwd(), "public", "uploads", "service-providers", serviceType, providerId), {
    force: true,
    recursive: true,
  });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireAdministrativeStaff(request);
    const { providerId, serviceType } = await context.params;
    const provider = await findInternalServiceProviderById(serviceType, providerId);

    if (!provider) {
      return internalJson({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
    }

    return internalJson({ provider });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải nhà cung cấp.", {
      route: "/api/internal/service-providers/[serviceType]/[providerId]#GET",
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { providerId, serviceType } = await context.params;
    const input = serviceProviderMutationSchema.parse(await request.json());
    const provider = await updateInternalServiceProvider(serviceType, providerId, input);

    if (!provider) {
      return internalJson({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "update",
      actor: user,
      description: `Cập nhật nhà cung cấp ${provider.providerName}.`,
      entityId: provider.providerId,
      entityType: "service_provider",
      request,
    });

    return internalJson({ provider });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật nhà cung cấp.", {
      route: "/api/internal/service-providers/[serviceType]/[providerId]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await requireAdministrativeStaff(request);
    const { providerId, serviceType } = await context.params;
    const { searchParams } = new URL(request.url);

    if (searchParams.get("mode") === "hard") {
      const deleted = await hardDeleteInternalServiceProvider(serviceType, providerId);

      if (!deleted) {
        return internalJson({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
      }

      await Promise.all([
        removeStoredFile(deleted.provider.imageUrl),
        removeStoredFile(deleted.provider.thumbnailUrl),
        ...deleted.media.flatMap((media) => [removeStoredFile(media.mediaUrl), removeStoredFile(media.thumbnailUrl)]),
      ]);
      await removeProviderFolder(serviceType, providerId);

      await writeInternalAuditEvent({
        action: "hard_delete",
        actor: user,
        description: `Xóa vĩnh viễn nhà cung cấp ${deleted.provider.providerName}.`,
        entityId: deleted.provider.providerId,
        entityType: "service_provider",
        request,
      });

      return internalJson({
        message: "Nhà cung cấp đã bị xóa vĩnh viễn.",
        provider: deleted.provider,
      });
    }

    const provider = await deleteInternalServiceProvider(serviceType, providerId);

    if (!provider) {
      return internalJson({ message: "Không tìm thấy nhà cung cấp." }, { status: 404 });
    }

    await writeInternalAuditEvent({
      action: "archive",
      actor: user,
      description: `Lưu trữ nhà cung cấp ${provider.providerName}.`,
      entityId: provider.providerId,
      entityType: "service_provider",
      request,
    });

    return internalJson({ provider });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa nhà cung cấp.", {
      route: "/api/internal/service-providers/[serviceType]/[providerId]#DELETE",
    });
  }
}
