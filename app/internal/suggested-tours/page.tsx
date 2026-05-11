import { redirect } from "next/navigation";

export default function InternalSuggestedToursPage() {
  redirect("/internal/suggested-tours/pending");
}
