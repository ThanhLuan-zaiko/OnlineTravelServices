import { NextResponse } from "next/server";

import { getAuthCookieValue, getCurrentCustomer } from "@/lib/server/auth";
import { listCustomerBookingsPage } from "@/lib/server/customer-activity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getCurrentCustomer(getAuthCookieValue(request));

  if (!user) {
    return NextResponse.json({ message: "Vui lòng đăng nhập để xem lịch sử đặt tour." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const query = searchParams.get("q");
    const parsedLimit = Number.parseInt(searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;
    const page = await listCustomerBookingsPage(user.userId, { cursor, limit, query });

    return NextResponse.json(page, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[customer-bookings] Failed to list bookings.", error);

    return NextResponse.json(
      { message: "Không thể tải lịch sử đặt tour." },
      { status: 500 },
    );
  }
}
