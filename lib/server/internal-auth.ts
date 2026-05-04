import "server-only";

import { AuthError, getAuthCookieValue, getCurrentAdministrativeStaff } from "@/lib/server/auth";

export async function requireAdministrativeStaff(request: Request) {
  const user = await getCurrentAdministrativeStaff(getAuthCookieValue(request));

  if (!user) {
    throw new AuthError("Bạn cần đăng nhập bằng tài khoản nhân sự hành chính.", 401);
  }

  return user;
}
