import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Quản lý nhà cung cấp | Online Travel Services",
};

export default function InternalProvidersPage() {
  redirect("/internal/providers/manage");
}
