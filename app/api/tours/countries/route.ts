import { NextResponse } from "next/server";

import { listPublicTourCountries } from "@/lib/server/public-tours";
import { publicTourFeedSchema } from "@/lib/shared/public-tours";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const feed = publicTourFeedSchema.parse(searchParams.get("feed") ?? "international");
    const countries = await listPublicTourCountries(feed);

    return NextResponse.json(
      { countries },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("[public-tours] Failed to list countries.", error);

    return NextResponse.json(
      { message: "Không thể tải danh sách quốc gia." },
      { status: 500 },
    );
  }
}
