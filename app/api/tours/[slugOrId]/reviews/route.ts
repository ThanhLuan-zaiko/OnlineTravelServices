import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAuthCookieValue, getCurrentCustomer } from "@/lib/server/auth";
import {
  createPublicTourReview,
  listPublicTourReviews,
} from "@/lib/server/public-tour-reviews";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { tourReviewMutationSchema } from "@/lib/shared/public-tours";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    slugOrId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { slugOrId } = await context.params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;
    const page = await listPublicTourReviews(slugOrId, { cursor, limit });

    if (!page) {
      return NextResponse.json({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[public-tours] Failed to list tour reviews.", error);

    return NextResponse.json(
      { message: "Không thể tải đánh giá tour." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    assertSameOriginRequest(request);
    const user = await getCurrentCustomer(getAuthCookieValue(request));

    if (!user) {
      return NextResponse.json(
        { message: "Vui lòng đăng nhập để đánh giá tour." },
        { status: 401 },
      );
    }

    const { slugOrId } = await context.params;
    const input = tourReviewMutationSchema.parse(await request.json());
    const review = await createPublicTourReview(slugOrId, user, input);

    if (!review) {
      return NextResponse.json({ message: "Không tìm thấy tour." }, { status: 404 });
    }

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { fields: error.issues.map((issue) => String(issue.path[0] ?? "")), message: error.issues[0]?.message ?? "Dữ liệu không hợp lệ." },
        { status: 400 },
      );
    }

    console.error("[public-tours] Failed to create tour review.", error);

    return NextResponse.json(
      { message: "Không thể gửi đánh giá tour." },
      { status: 500 },
    );
  }
}
