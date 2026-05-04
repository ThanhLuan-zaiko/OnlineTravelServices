import { requireAdministrativeStaff } from "@/lib/server/internal-auth";
import { internalErrorResponse, internalJson } from "@/lib/server/internal-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdministrativeStaff(request);
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return internalJson({ results: [] });
    }

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "online-travel-services/1.0",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Nominatim search failed with status ${response.status}`);
    }

    const data = (await response.json()) as Array<{
      address?: Record<string, string>;
      display_name: string;
      lat: string;
      lon: string;
      type?: string;
    }>;

    return internalJson({
      results: data.map((entry) => ({
        address: entry.address ?? {},
        displayName: entry.display_name,
        latitude: Number(entry.lat),
        longitude: Number(entry.lon),
        type: entry.type ?? null,
      })),
    });
  } catch (error) {
    return internalErrorResponse(error, "Không thể tìm kiếm địa điểm trên bản đồ.", {
      route: "/api/internal/maps/search#GET",
    });
  }
}
