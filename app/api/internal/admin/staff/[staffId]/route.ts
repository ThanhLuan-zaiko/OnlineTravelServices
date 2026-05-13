import { requireSuperAdminStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { getAdminStaff, hardDeleteAdminStaff, updateAdminStaff } from "@/lib/server/internal-admin";
import { adminStaffHardDeleteSchema, adminStaffUpdateSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    staffId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireSuperAdminStaff(request);
    const { staffId } = await context.params;
    const staff = await getAdminStaff(staffId);

    if (!staff) {
      return internalJson({ message: "Không tìm thấy nhân viên." }, { status: 404 });
    }

    return internalJson({ staff });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải nhân viên.", {
      route: "/api/internal/admin/staff/[staffId]#GET",
    });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireSuperAdminStaff(request);
    const { staffId } = await context.params;
    const payload = adminStaffUpdateSchema.parse(await request.json());
    const staff = await updateAdminStaff(staffId, payload, user, request);

    return internalJson({ staff });
  } catch (error) {
    return internalErrorResponse(error, "Không thể cập nhật nhân viên.", {
      route: "/api/internal/admin/staff/[staffId]#PATCH",
    });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await requireSuperAdminStaff(request);
    const { staffId } = await context.params;

    adminStaffHardDeleteSchema.parse(await request.json());
    await hardDeleteAdminStaff(staffId, user, request);

    return internalJson({ message: "Đã xóa cứng nhân viên." });
  } catch (error) {
    return internalErrorResponse(error, "Không thể xóa nhân viên.", {
      route: "/api/internal/admin/staff/[staffId]#DELETE",
    });
  }
}
