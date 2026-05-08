import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Quản lý khuyến mãi | Online Travel Services",
};

export default function InternalPromotionsPage() {
  redirect("/internal/promotions/manage");
}
