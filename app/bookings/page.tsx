import type { Metadata } from "next";

import { CustomerHistoryPage } from "@/components/customer-facing/customer-history-page";
import { requireCustomerPage } from "@/lib/server/customer-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lịch sử đặt tour | Online Travel Services",
};

export default async function BookingsPage() {
  await requireCustomerPage("/bookings");

  return <CustomerHistoryPage mode="bookings" />;
}
