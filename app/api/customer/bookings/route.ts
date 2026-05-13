import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AuthError, getAuthCookieValue, getCurrentCustomer } from "@/lib/server/auth";
import { listCustomerBookingsPage } from "@/lib/server/customer-activity";
import { createCustomerBooking, CustomerBookingError } from "@/lib/server/customer-bookings";
import { syncPublicTourProjection } from "@/lib/server/public-tours";
import { assertSameOriginRequest } from "@/lib/server/request-security";
import { customerBookingMutationSchema } from "@/lib/shared/bookings";

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

export async function POST(request: Request) {
  try {
    assertSameOriginRequest(request);
    const user = await getCurrentCustomer(getAuthCookieValue(request));

    if (!user) {
      return NextResponse.json({ message: "Vui lòng đăng nhập để đặt tour." }, { status: 401 });
    }

    const input = customerBookingMutationSchema.parse(await request.json());
    const booking = await createCustomerBooking(user, input);

    try {
      await syncPublicTourProjection(booking.tourId);
    } catch (error) {
      console.error("[customer-bookings] Failed to sync public tour projection after booking.", error);
    }

    return NextResponse.json(
      { booking },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          fields: error.issues.map((issue) => String(issue.path[0] ?? "")),
          message: error.issues[0]?.message ?? "Dữ liệu đặt tour không hợp lệ.",
        },
        { status: 400 },
      );
    }

    if (error instanceof CustomerBookingError || error instanceof AuthError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("[customer-bookings] Failed to create booking.", error);

    return NextResponse.json(
      { message: "Không thể tạo booking lúc này." },
      { status: 500 },
    );
  }
}
