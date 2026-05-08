import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Quản lý dịch vụ đi kèm | Online Travel Services",
};

export default function InternalServicesPage() {
  redirect("/internal/services/manage");
}
