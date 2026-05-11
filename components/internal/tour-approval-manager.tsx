"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { FiAlertTriangle, FiCheckCircle, FiEdit3, FiPlus, FiRefreshCw, FiThumbsDown } from "react-icons/fi";

import { useToast } from "@/components/ui/toast";
import {
  createInternalTourApproval,
  decideInternalTourApproval,
  getInternalTourApprovalPage,
  type ApiError,
} from "@/lib/client/api-client";
import {
  tourApprovalMutationSchema,
  type InternalTourApproval,
  type TourApprovalDecisionRequest,
  type TourApprovalMutationRequest,
} from "@/lib/shared/internal";

import { InlineSelect, ListFilters, WorkspaceTabs } from "./catalog-workspace-ui";
import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

type ApprovalTab = "approved" | "change_requested" | "pending" | "rejected";

const tabs = [
  { href: "/internal/tour-approvals/pending", icon: FiRefreshCw, label: "Pending" },
  { href: "/internal/tour-approvals/approved", icon: FiCheckCircle, label: "Approved" },
  { href: "/internal/tour-approvals/rejected", icon: FiThumbsDown, label: "Rejected" },
  { href: "/internal/tour-approvals/change-requests", icon: FiEdit3, label: "Change requests" },
];

const initialForm: TourApprovalMutationRequest = {
  requestNote: "",
  requestedByName: "",
  riskFlags: [],
  tourId: "",
  tourTitle: "",
};

function getTab(pathname: string): ApprovalTab {
  if (pathname.startsWith("/internal/tour-approvals/approved")) return "approved";
  if (pathname.startsWith("/internal/tour-approvals/rejected")) return "rejected";
  if (pathname.startsWith("/internal/tour-approvals/change-requests")) return "change_requested";
  return "pending";
}

function splitLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

export function TourApprovalManager() {
  const pathname = usePathname();
  const activeTab = getTab(pathname);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<TourApprovalMutationRequest>(initialForm);
  const [riskText, setRiskText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [changeDetails, setChangeDetails] = useState<Record<string, string>>({});

  const listQuery = useQuery({
    queryKey: ["internal", "tour-approvals", activeTab, searchQuery, pageSize] as const,
    queryFn: () => getInternalTourApprovalPage({ limit: pageSize, q: searchQuery, status: activeTab }),
  });

  const createMutation = useMutation({
    mutationFn: (input: TourApprovalMutationRequest) => createInternalTourApproval(input),
    onSuccess: async () => {
      setForm(initialForm);
      setRiskText("");
      await queryClient.invalidateQueries({ queryKey: ["internal", "tour-approvals"] });
      showToast({ title: "Đã tạo yêu cầu", message: "Yêu cầu phê duyệt tour đã vào hàng chờ.", variant: "success" });
    },
    onError: (error) => showToast({ title: "Không thể tạo", message: (error as ApiError).message, variant: "error" }),
  });

  const decisionMutation = useMutation({
    mutationFn: ({ approvalId, input }: { approvalId: string; input: TourApprovalDecisionRequest }) =>
      decideInternalTourApproval(approvalId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "tour-approvals"] });
      showToast({ title: "Đã ghi quyết định", message: "Yêu cầu phê duyệt đã được cập nhật.", variant: "success" });
    },
    onError: (error) => showToast({ title: "Không thể ghi quyết định", message: (error as ApiError).message, variant: "error" }),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = tourApprovalMutationSchema.safeParse({ ...form, riskFlags: splitLines(riskText) });

    if (!parsed.success) {
      showToast({ title: "Dữ liệu chưa hợp lệ", message: parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại.", variant: "error" });
      return;
    }

    createMutation.mutate(parsed.data);
  };

  const decide = (approval: InternalTourApproval, decision: TourApprovalDecisionRequest["decision"]) => {
    const reviewNote = reviewNotes[approval.approvalId]?.trim();

    if (!reviewNote) {
      showToast({ title: "Thiếu ghi chú", message: "Nhập ghi chú duyệt trước khi xử lý.", variant: "error" });
      return;
    }

    decisionMutation.mutate({
      approvalId: approval.approvalId,
      input: {
        changeRequestDetail: changeDetails[approval.approvalId]?.trim() || null,
        decision,
        reviewNote,
      },
    });
  };

  const approvals = listQuery.data?.approvals ?? [];

  return (
    <div className="space-y-5">
      <InternalPageHeader
        description="Xử lý yêu cầu duyệt tour, ghi lý do từ chối hoặc yêu cầu chỉnh sửa trước khi xuất bản."
        title="Phê duyệt tour"
      />
      <WorkspaceTabs pathname={pathname} tabs={tabs} />

      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <InternalPanel className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <FiPlus className="text-slate-400" size={16} />
            <h3 className="text-base font-semibold">Tạo yêu cầu phê duyệt</h3>
          </div>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <TextInput label="Tour ID" value={form.tourId} onChange={(value) => setForm((current) => ({ ...current, tourId: value }))} />
            <TextInput label="Tên tour" value={form.tourTitle} onChange={(value) => setForm((current) => ({ ...current, tourTitle: value }))} />
            <TextInput label="Người yêu cầu" value={form.requestedByName ?? ""} onChange={(value) => setForm((current) => ({ ...current, requestedByName: value || null }))} />
            <Textarea label="Ghi chú yêu cầu" value={form.requestNote ?? ""} onChange={(value) => setForm((current) => ({ ...current, requestNote: value || null }))} />
            <Textarea label="Cờ rủi ro" value={riskText} onChange={setRiskText} placeholder="Mỗi dòng là một rủi ro cần duyệt." />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950" disabled={createMutation.isPending} type="submit">
              <FiPlus size={17} />
              Tạo yêu cầu
            </button>
          </form>
        </InternalPanel>

        <InternalPanel className="p-4">
          <ListFilters pageSize={pageSize} searchQuery={searchQuery} setPageSize={setPageSize} setSearchQuery={setSearchQuery}>
            <InlineSelect label="Trạng thái" name="approval-status" onChange={() => undefined} options={[{ label: activeTab, value: activeTab }]} value={activeTab} />
          </ListFilters>
          <div className="mt-4 space-y-3">
            {approvals.length === 0 ? (
              <EmptyState message={listQuery.isLoading ? "Đang tải yêu cầu..." : "Không có yêu cầu trong tab này."} />
            ) : (
              approvals.map((approval) => (
                <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-black" key={approval.approvalId}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">{approval.tourTitle}</h3>
                      <p className="mt-1 text-xs text-slate-500">{approval.tourId}</p>
                    </div>
                    <StatusPill value={approval.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-neutral-400">{approval.requestNote || "Không có ghi chú yêu cầu."}</p>
                  {approval.riskFlags.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {approval.riskFlags.map((flag) => (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:text-amber-300" key={flag}>
                          <FiAlertTriangle size={12} />
                          {flag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {approval.status === "pending" ? (
                    <div className="mt-4 grid gap-3">
                      <Textarea label="Ghi chú duyệt" value={reviewNotes[approval.approvalId] ?? ""} onChange={(value) => setReviewNotes((current) => ({ ...current, [approval.approvalId]: value }))} />
                      <Textarea label="Chi tiết yêu cầu chỉnh sửa" value={changeDetails[approval.approvalId] ?? ""} onChange={(value) => setChangeDetails((current) => ({ ...current, [approval.approvalId]: value }))} />
                      <div className="flex flex-wrap gap-2">
                        <ActionButton icon={<FiCheckCircle size={15} />} label="Approve" onClick={() => decide(approval, "approved")} />
                        <ActionButton icon={<FiThumbsDown size={15} />} label="Reject" onClick={() => decide(approval, "rejected")} />
                        <ActionButton icon={<FiEdit3 size={15} />} label="Request changes" onClick={() => decide(approval, "change_requested")} />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">{approval.reviewNote}</p>
                  )}
                </article>
              ))
            )}
          </div>
        </InternalPanel>
      </div>
    </div>
  );
}

function TextInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-neutral-800 dark:bg-black" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder?: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-800 dark:bg-black" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

function ActionButton({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900" onClick={onClick} type="button">
      {icon}
      {label}
    </button>
  );
}
