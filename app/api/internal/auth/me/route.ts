import { getAuthCookieValue, getCurrentInternalStaff } from "@/lib/server/auth";
import { internalJson } from "@/lib/server/internal-api";
import { getStaffAccessDetails } from "@/lib/server/internal-staff-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentInternalStaff(getAuthCookieValue(request));

  if (!user) {
    return internalJson({ user: null }, { status: 401 });
  }

  try {
    return internalJson({ user: await getStaffAccessDetails(user) });
  } catch {
    return internalJson({ user: null }, { status: 401 });
  }
}
