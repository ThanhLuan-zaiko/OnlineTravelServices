import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return internalJson({ result: null });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
      {
        headers: {
          "User-Agent": "online-travel-services/1.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Nominatim reverse lookup failed with status ${response.status}`);
    }

    const data = (await response.json()) as {
      address?: Record<string, string>;
      display_name?: string;
    };

    return internalJson({
      result: {
        address: data.address ?? {},
        displayName: data.display_name ?? "",
        latitude: lat,
        longitude: lng,
      },
    });
  } catch (error) {
    return internalErrorResponse(error, "Không thể lấy thông tin bản đồ.", {
      route: "/api/internal/maps/reverse#GET",
    });
  }
}
