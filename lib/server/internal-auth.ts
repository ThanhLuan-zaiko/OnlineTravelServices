import "server-only";

import {
  AuthError,
  getAuthCookieValue,
  getCurrentAdministrativeStaff,
  getCurrentInternalStaff,
} from "@/lib/server/auth";
import {
  ADMINISTRATIVE_STAFF_ROLE,
  OPERATIONS_STATISTICS_STAFF_ROLE,
} from "@/lib/server/auth-constants";
import { assertOperationsAccess, assertSuperAdminStaff } from "@/lib/server/internal-staff-access";

export async function requireAdministrativeStaff(request: Request) {
  const user = await getCurrentAdministrativeStaff(getAuthCookieValue(request));

  if (!user) {
    throw new AuthError("Bạn cần đăng nhập bằng tài khoản nhân sự hành chính.", 401);
  }

  return user;
}

export async function requireSuperAdminStaff(request: Request) {
  const user = await requireAdministrativeStaff(request);

  await assertSuperAdminStaff(user);

  return user;
}

export async function requireInternalStaff(request: Request) {
  const user = await getCurrentInternalStaff(getAuthCookieValue(request));

  if (!user) {
    throw new AuthError("Bạn cần đăng nhập bằng tài khoản nhân sự nội bộ.", 401);
  }

  return user;
}

export async function requireOperationsStatisticsStaff(request: Request) {
  const user = await requireInternalStaff(request);

  if (user.role !== OPERATIONS_STATISTICS_STAFF_ROLE) {
    throw new AuthError("Bạn không có quyền truy cập chức năng vận hành và thống kê.", 403);
  }

  return user;
}

export async function requireOperationsAccess(request: Request) {
  const user = await requireInternalStaff(request);

  if (user.role !== ADMINISTRATIVE_STAFF_ROLE && user.role !== OPERATIONS_STATISTICS_STAFF_ROLE) {
    throw new AuthError("Bạn không có quyền truy cập chức năng vận hành và thống kê.", 403);
  }

  await assertOperationsAccess(user);

  return user;
}
