"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { FiCheckCircle, FiGitBranch, FiPlus, FiRefreshCw, FiThumbsDown } from "react-icons/fi";

import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  createInternalSuggestedTour,
  decideInternalSuggestedTour,
  getInternalSuggestedTourPage,
  type ApiError,
} from "@/lib/client/api-client";
import {
  suggestedTourMutationSchema,
  type InternalSuggestedTour,
  type SuggestedTourDecisionRequest,
  type SuggestedTourMutationRequest,
} from "@/lib/shared/internal";

import { InlineSelect, ListFilters, WorkspaceTabs } from "./catalog-workspace-ui";
import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

type SuggestedTourTab = "approved" | "converted" | "pending" | "rejected";

const tabs = [
  { href: "/internal/suggested-tours/pending", icon: FiRefreshCw, label: "Pending" },
  { href: "/internal/suggested-tours/approved", icon: FiCheckCircle, label: "Approved" },
  { href: "/internal/suggested-tours/rejected", icon: FiThumbsDown, label: "Rejected" },
  { href: "/internal/suggested-tours/converted", icon: FiGitBranch, label: "Converted" },
];

const sourceOptions = [
  { label: "Khách hàng", value: "customer" },
  { label: "Nhân sự", value: "staff" },
  { label: "Xu hướng", value: "trend" },
];

const safetyOptions = [
  { label: "low", value: "low" },
  { label: "medium", value: "medium" },
  { label: "high", value: "high" },
];

const initialForm: SuggestedTourMutationRequest = {
  budgetAmount: "12000000",
  currency: "VND",
  destinationId: null,
  destinationName: "",
  estimatedGuests: 12,
  feasibilityIssues: [],
  feasibilityScore: 75,
  itinerarySummary: "",
  proposedBy: null,
  proposedByName: "",
  proposedEndDate: null,
  proposedStartDate: null,
  safetyLevel: "medium",
  serviceSummary: "",
  sourceType: "customer",
  status: "pending",
  title: "",
};

function getTab(pathname: string): SuggestedTourTab {
  if (pathname.startsWith("/internal/suggested-tours/approved")) return "approved";
  if (pathname.startsWith("/internal/suggested-tours/rejected")) return "rejected";
  if (pathname.startsWith("/internal/suggested-tours/converted")) return "converted";
  return "pending";
}

function splitLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function money(value: string, currency: string) {
  return `${Number(value).toLocaleString("vi-VN")} ${currency}`;
}

export function SuggestedTourManager() {
  const pathname = usePathname();
  const activeTab = getTab(pathname);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<SuggestedTourMutationRequest>(initialForm);
  const [issueText, setIssueText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [alternatives, setAlternatives] = useState<Record<string, string>>({});

  const listQuery = useQuery({
    queryKey: ["internal", "suggested-tours", activeTab, searchQuery, pageSize] as const,
    queryFn: () => getInternalSuggestedTourPage({ limit: pageSize, q: searchQuery, status: activeTab }),
  });

  const createMutation = useMutation({
    mutationFn: (input: SuggestedTourMutationRequest) => createInternalSuggestedTour(input),
    onSuccess: async () => {
      setForm(initialForm);
      setIssueText("");
      await queryClient.invalidateQueries({ queryKey: ["internal", "suggested-tours"] });
      showToast({ title: "Đã tạo tour đề xuất", message: "Tour đề xuất đã vào hàng chờ kiểm tra.", variant: "success" });
    },
    onError: (error) => showToast({ title: "Không thể tạo", message: (error as ApiError).message, variant: "error" }),
  });

  const decisionMutation = useMutation({
    mutationFn: ({ input, suggestionId }: { input: SuggestedTourDecisionRequest; suggestionId: string }) =>
      decideInternalSuggestedTour(suggestionId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "suggested-tours"] });
      await queryClient.invalidateQueries({ queryKey: ["internal", "tours"] });
      showToast({ title: "Đã ghi quyết định", message: "Trạng thái tour đề xuất đã được cập nhật.", variant: "success" });
    },
    onError: (error) => showToast({ title: "Không thể ghi quyết định", message: (error as ApiError).message, variant: "error" }),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = suggestedTourMutationSchema.safeParse({ ...form, feasibilityIssues: splitLines(issueText) });

    if (!parsed.success) {
      showToast({ title: "Dữ liệu chưa hợp lệ", message: parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại.", variant: "error" });
      return;
    }

    createMutation.mutate(parsed.data);
  };

  const decide = (suggestion: InternalSuggestedTour, decision: SuggestedTourDecisionRequest["decision"]) => {
    const decisionNote = notes[suggestion.suggestionId]?.trim();

    if (!decisionNote) {
      showToast({ title: "Thiếu ghi chú", message: "Nhập ghi chú quyết định trước khi duyệt.", variant: "error" });
      return;
    }

    decisionMutation.mutate({
      input: {
        alternativeSuggestion: alternatives[suggestion.suggestionId]?.trim() || null,
        decision,
        decisionNote,
        publishConvertedTour: false,
      },
      suggestionId: suggestion.suggestionId,
    });
  };

  const suggestions = listQuery.data?.suggestions ?? [];

  return (
    <div className="space-y-5">
      <InternalPageHeader
        description="Kiểm tra tính khả thi theo ngân sách, điểm đến, lịch trình, dịch vụ và mức an toàn trước khi phê duyệt hoặc chuyển thành tour."
        title="Tour đề xuất"
      />
      <WorkspaceTabs pathname={pathname} tabs={tabs} />

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <InternalPanel className="p-4">
          <div className="mb-4 flex items-center gap-2">
            <FiPlus className="text-slate-400" size={16} />
            <h3 className="text-base font-semibold">Tạo tour đề xuất</h3>
          </div>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <TextInput label="Tên đề xuất" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Destination ID" value={form.destinationId ?? ""} onChange={(value) => setForm((current) => ({ ...current, destinationId: value || null }))} />
              <TextInput label="Điểm đến" value={form.destinationName} onChange={(value) => setForm((current) => ({ ...current, destinationName: value }))} />
              <TextInput label="Ngân sách" value={form.budgetAmount} onChange={(value) => setForm((current) => ({ ...current, budgetAmount: value }))} />
              <TextInput label="Khách dự kiến" type="number" value={String(form.estimatedGuests)} onChange={(value) => setForm((current) => ({ ...current, estimatedGuests: Number(value) }))} />
              <TextInput label="Bắt đầu" type="date" value={form.proposedStartDate ?? ""} onChange={(value) => setForm((current) => ({ ...current, proposedStartDate: value || null }))} />
              <TextInput label="Kết thúc" type="date" value={form.proposedEndDate ?? ""} onChange={(value) => setForm((current) => ({ ...current, proposedEndDate: value || null }))} />
              <SelectField label="Nguồn" name="suggested-source" onValueChange={(value) => setForm((current) => ({ ...current, sourceType: value }))} options={sourceOptions} placeholder="Nguồn" value={form.sourceType} />
              <SelectField label="Mức an toàn" name="suggested-safety" onValueChange={(value) => setForm((current) => ({ ...current, safetyLevel: value }))} options={safetyOptions} placeholder="Mức an toàn" value={form.safetyLevel} />
              <TextInput label="Điểm khả thi" type="number" value={String(form.feasibilityScore)} onChange={(value) => setForm((current) => ({ ...current, feasibilityScore: Number(value) }))} />
              <TextInput label="Tên người đề xuất" value={form.proposedByName ?? ""} onChange={(value) => setForm((current) => ({ ...current, proposedByName: value || null }))} />
            </div>
            <Textarea label="Tóm tắt lịch trình" value={form.itinerarySummary} onChange={(value) => setForm((current) => ({ ...current, itinerarySummary: value }))} />
            <Textarea label="Tóm tắt dịch vụ" value={form.serviceSummary} onChange={(value) => setForm((current) => ({ ...current, serviceSummary: value }))} />
            <Textarea label="Vấn đề khả thi" value={issueText} onChange={setIssueText} placeholder="Mỗi dòng là một vấn đề cần kiểm tra." />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950" disabled={createMutation.isPending} type="submit">
              <FiPlus size={17} />
              Tạo đề xuất
            </button>
          </form>
        </InternalPanel>

        <InternalPanel className="p-4">
          <ListFilters pageSize={pageSize} searchQuery={searchQuery} setPageSize={setPageSize} setSearchQuery={setSearchQuery}>
            <InlineSelect label="Trạng thái" name="suggested-status" onChange={() => undefined} options={[{ label: activeTab, value: activeTab }]} value={activeTab} />
          </ListFilters>
          <div className="mt-4 space-y-3">
            {suggestions.length === 0 ? (
              <EmptyState message={listQuery.isLoading ? "Đang tải tour đề xuất..." : "Không có tour đề xuất trong tab này."} />
            ) : (
              suggestions.map((suggestion) => (
                <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-black" key={suggestion.suggestionId}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold">{suggestion.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{suggestion.destinationName} - {money(suggestion.budgetAmount, suggestion.currency)}</p>
                    </div>
                    <StatusPill value={suggestion.status} />
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-slate-600 dark:text-neutral-400 md:grid-cols-3">
                    <Metric label="Khả thi" value={`${suggestion.feasibilityScore}/100`} />
                    <Metric label="An toàn" value={suggestion.safetyLevel} />
                    <Metric label="Khách" value={String(suggestion.estimatedGuests)} />
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-neutral-400">{suggestion.itinerarySummary}</p>
                  {suggestion.feasibilityIssues.length ? (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{suggestion.feasibilityIssues.join(" | ")}</p>
                  ) : null}
                  {suggestion.status === "pending" ? (
                    <div className="mt-4 grid gap-3">
                      <Textarea label="Ghi chú quyết định" value={notes[suggestion.suggestionId] ?? ""} onChange={(value) => setNotes((current) => ({ ...current, [suggestion.suggestionId]: value }))} />
                      <Textarea label="Đề xuất thay thế" value={alternatives[suggestion.suggestionId] ?? ""} onChange={(value) => setAlternatives((current) => ({ ...current, [suggestion.suggestionId]: value }))} />
                      <div className="flex flex-wrap gap-2">
                        <ActionButton icon={<FiCheckCircle size={15} />} label="Approve" onClick={() => decide(suggestion, "approved")} />
                        <ActionButton icon={<FiThumbsDown size={15} />} label="Reject" onClick={() => decide(suggestion, "rejected")} />
                        <ActionButton icon={<FiGitBranch size={15} />} label="Convert draft" onClick={() => decide(suggestion, "converted")} />
                      </div>
                    </div>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </InternalPanel>
      </div>
    </div>
  );
}

function TextInput({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-neutral-800 dark:bg-black" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950 dark:text-neutral-50">{value}</p>
    </div>
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
