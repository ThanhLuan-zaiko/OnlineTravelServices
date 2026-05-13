import "server-only";

import {
  AuthError,
  getAuthCookieValue,
  getCurrentAdministrativeStaff,
  getCurrentInternalStaff,
} from "@/lib/server/auth";
import { OPERATIONS_STATISTICS_STAFF_ROLE } from "@/lib/server/auth-constants";

export async function requireAdministrativeStaff(request: Request) {
  const user = await getCurrentAdministrativeStaff(getAuthCookieValue(request));

  if (!user) {
    throw new AuthError("Bạn cần đăng nhập bằng tài khoản nhân sự hành chính.", 401);
  }

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
