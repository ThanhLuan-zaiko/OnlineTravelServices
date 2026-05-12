import type { Metadata } from "next";

import { CustomerHistoryPage } from "@/components/customer-facing/customer-history-page";
import { requireCustomerPage } from "@/lib/server/customer-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lịch sử thanh toán | Online Travel Services",
};

export default async function PaymentsPage() {
  await requireCustomerPage("/payments");

  return <CustomerHistoryPage mode="payments" />;
}
