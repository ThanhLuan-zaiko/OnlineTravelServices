import { NextResponse } from "next/server";

import { getPublicTourDetail } from "@/lib/server/public-tours";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    slugOrId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slugOrId } = await context.params;
    const tour = await getPublicTourDetail(slugOrId);

    if (!tour) {
      return NextResponse.json({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    return NextResponse.json({ tour }, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[public-tours] Failed to load tour detail.", error);

    return NextResponse.json(
      { message: "Không thể tải thông tin tour." },
      { status: 500 },
    );
  }
}
