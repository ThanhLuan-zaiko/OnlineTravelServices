import { requireSuperAdminStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";
import { createAdminStaff, listAdminStaff } from "@/lib/server/internal-admin";
import { adminStaffCreateSchema, adminStaffRoleSchema, adminStaffStatusSchema } from "@/lib/shared/internal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireSuperAdminStaff(request);
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get("role") ?? "all";
    const statusParam = searchParams.get("status") ?? "all";
    const staff = await listAdminStaff({
      role: roleParam === "all" ? "all" : adminStaffRoleSchema.parse(roleParam),
      status: statusParam === "all" ? "all" : adminStaffStatusSchema.parse(statusParam),
    });

    return internalJson({ staff });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tải danh sách nhân viên.", {
      route: "/api/internal/admin/staff#GET",
    });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireSuperAdminStaff(request);
    const payload = adminStaffCreateSchema.parse(await request.json());
    const staff = await createAdminStaff(payload, user, request);

    return internalJson({ staff }, { status: 201 });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tạo nhân viên nội bộ.", {
      route: "/api/internal/admin/staff#POST",
    });
  }
}
