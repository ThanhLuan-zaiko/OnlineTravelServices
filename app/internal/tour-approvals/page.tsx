import { redirect } from "next/navigation";

export default function InternalTourApprovalsPage() {
  redirect("/internal/tour-approvals/pending");
}
