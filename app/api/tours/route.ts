import { NextResponse } from "next/server";

import { listPublicToursPage } from "@/lib/server/public-tours";
import { publicTourFeedSchema } from "@/lib/shared/public-tours";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const feed = publicTourFeedSchema.parse(searchParams.get("feed") ?? "all");
    const countryKey = searchParams.get("country");
    const cursor = searchParams.get("cursor");
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;
    const page = await listPublicToursPage(feed, { countryKey, cursor, limit });

    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[public-tours] Failed to list tours.", error);

    return NextResponse.json(
      { message: "Không thể tải danh sách tour." },
      { status: 500 },
    );
  }
}
