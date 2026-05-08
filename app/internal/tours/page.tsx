import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Quản lý tour | Online Travel Services",
};

export default function InternalToursPage() {
  redirect("/internal/tours/manage");
}
