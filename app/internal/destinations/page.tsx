import { redirect } from "next/navigation";

export default function InternalDestinationsPage() {
  redirect("/internal/destinations/list");
}
