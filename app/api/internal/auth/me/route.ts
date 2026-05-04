import { getAuthCookieValue, getCurrentAdministrativeStaff } from "@/lib/server/auth";
import { internalJson } from "@/lib/server/internal-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentAdministrativeStaff(getAuthCookieValue(request));

  if (!user) {
    return internalJson({ user: null }, { status: 401 });
  }

  return internalJson({ user });
}
