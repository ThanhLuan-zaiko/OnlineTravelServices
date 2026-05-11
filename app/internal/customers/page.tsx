import { redirect } from "next/navigation";

export default function InternalCustomersPage() {
  redirect("/internal/customers/list");
}
