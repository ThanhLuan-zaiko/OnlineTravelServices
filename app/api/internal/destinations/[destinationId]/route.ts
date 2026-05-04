import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { archiveInternalDestination, findInternalDestination, updateInternalDestination } from "@/lib/server/internal-data";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { destinationMutationSchema } from "@/lib/shared/internal";

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
    const destination = await archiveInternalDestination(destinationId, user.userId);

    if (!destination) {
      return internalJson({ message: "Không tìm thấy địa điểm." }, { status: 404 });
    }

    return internalJson({ destination });
  } catch (error) {
    return internalErrorResponse(error, "Không thể lưu trữ địa điểm.", {
      route: "/api/internal/destinations/[destinationId]#DELETE",
    });
  }
}
