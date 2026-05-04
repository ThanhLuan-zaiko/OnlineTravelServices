"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FiArchive, FiEdit2, FiPlus, FiSave } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  archiveInternalPromotion,
  createInternalPromotion,
  getInternalPromotions,
  updateInternalPromotion,
  type ApiError,
} from "@/lib/client/api-client";
import {
  promotionMutationSchema,
  type InternalPromotion,
  type PromotionMutationRequest,
} from "@/lib/shared/internal";

import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

const initialForm: PromotionMutationRequest = {
  code: "",
  customerTier: "standard",
  description: "",
  discountType: "percent",
  discountValue: "10",
  endAt: "",
  maxDiscountAmount: null,
  promotionType: "campaign",
  startAt: "",
  status: "draft",
  title: "",
  usageLimit: 100,
};

function toDateTimeInput(value: string) {
  return value ? value.slice(0, 16) : "";
}

export function PromotionManager() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<InternalPromotion | null>(null);
  const [form, setForm] = useState<PromotionMutationRequest>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingArchiveId, setPendingArchiveId] = useState<string | null>(null);
  const queryKey = useMemo(() => ["internal", "promotions", status] as const, [status]);
  const promotionsQuery = useQuery({
    queryKey,
    queryFn: () => getInternalPromotions(status || undefined),
  });
  const promotionStatusOptions = [
    { label: "draft", value: "draft" },
    { label: "scheduled", value: "scheduled" },
    { label: "published", value: "published" },
    { label: "expired", value: "expired" },
    { label: "archived", value: "archived" },
  ];
  const discountTypeOptions = [
    { label: "percent", value: "percent" },
    { label: "amount", value: "amount" },
  ];
  const saveMutation = useMutation({
    mutationFn: (input: PromotionMutationRequest) =>
      editing ? updateInternalPromotion(editing.promotionId, input) : createInternalPromotion(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotions"] });
      setEditing(null);
      setForm(initialForm);
      showToast({ message: "Khuyến mãi đã được lưu.", title: "Lưu thành công", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Không thể lưu", variant: "error" }),
  });
  const archiveMutation = useMutation({
    mutationFn: archiveInternalPromotion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotions"] });
      setPendingArchiveId(null);
    },
  });
  const promotions = promotionsQuery.data?.promotions ?? [];

  const startEdit = (promotion: InternalPromotion) => {
    setEditing(promotion);
    setForm({
      code: promotion.code,
      customerTier: promotion.customerTier,
      description: promotion.description,
      discountType: promotion.discountType,
      discountValue: promotion.discountValue,
      endAt: toDateTimeInput(promotion.endAt),
      maxDiscountAmount: promotion.maxDiscountAmount,
      promotionType: promotion.promotionType,
      startAt: toDateTimeInput(promotion.startAt),
      status: promotion.status,
      title: promotion.title,
      usageLimit: promotion.usageLimit,
    });
  };

  const updateForm = (key: keyof PromotionMutationRequest, value: unknown) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const parsed = promotionMutationSchema.safeParse(form);

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Khuyến mãi không hợp lệ.");
      return;
    }

    saveMutation.mutate(parsed.data);
  };

  return (
    <div className="space-y-5">
      <InternalPageHeader
        action={
          <button
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:from-violet-400 dark:via-fuchsia-400 dark:to-rose-400 dark:text-slate-950"
            onClick={() => {
              setEditing(null);
              setForm(initialForm);
            }}
            type="button"
          >
            <FiPlus size={17} />
            Khuyến mãi mới
          </button>
        }
        description="Quản lý mã, hạng khách hàng, thời gian áp dụng và trạng thái chiến dịch khuyến mãi."
        title="Quản lý chương trình khuyến mãi"
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.3fr]">
        <InternalPanel className="p-4">
          <h3 className="text-base font-semibold">{editing ? "Cập nhật khuyến mãi" : "Tạo khuyến mãi"}</h3>
          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Mã" value={form.code} onChange={(event) => updateForm("code", event.target.value)} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Tên" value={form.title} onChange={(event) => updateForm("title", event.target.value)} />
              <SelectField
                label="Trạng thái"
                name="promotion-status"
                onValueChange={(value) => updateForm("status", value)}
                options={promotionStatusOptions}
                placeholder="Chọn trạng thái"
                value={form.status}
              />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Hạng khách" value={form.customerTier} onChange={(event) => updateForm("customerTier", event.target.value)} />
              <SelectField
                label="Loại giảm"
                name="promotion-discount-type"
                onValueChange={(value) => updateForm("discountType", value)}
                options={discountTypeOptions}
                placeholder="Chọn loại giảm"
                value={form.discountType}
              />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Giá trị" value={form.discountValue} onChange={(event) => updateForm("discountValue", event.target.value)} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Giảm tối đa" value={form.maxDiscountAmount ?? ""} onChange={(event) => updateForm("maxDiscountAmount", event.target.value || null)} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Loại chương trình" value={form.promotionType} onChange={(event) => updateForm("promotionType", event.target.value)} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="datetime-local" value={form.startAt} onChange={(event) => updateForm("startAt", event.target.value)} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="datetime-local" value={form.endAt} onChange={(event) => updateForm("endAt", event.target.value)} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={form.usageLimit} onChange={(event) => updateForm("usageLimit", Number(event.target.value))} />
            </div>
            <textarea className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Mô tả" value={form.description ?? ""} onChange={(event) => updateForm("description", event.target.value)} />
            {formError ? <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{formError}</p> : null}
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70" disabled={saveMutation.isPending} type="submit">
              <FiSave size={17} />
              Lưu khuyến mãi
            </button>
          </form>
        </InternalPanel>

        <InternalPanel className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold">Danh sách khuyến mãi</h3>
            <SelectField
              buttonClassName="h-10"
              className="min-w-[220px]"
              label="Lọc trạng thái"
              name="promotion-status-filter"
              onValueChange={setStatus}
              options={promotionStatusOptions}
              placeholder="Tất cả trạng thái"
              value={status}
            />
          </div>
          {promotions.length === 0 ? (
            <EmptyState message={promotionsQuery.isLoading ? "Đang tải khuyến mãi..." : "Chưa có khuyến mãi phù hợp."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500 dark:text-neutral-500">
                  <tr>
                    <th className="px-3 py-3">Mã</th>
                    <th className="px-3 py-3">Tên</th>
                    <th className="px-3 py-3">Hạng</th>
                    <th className="px-3 py-3">Giảm</th>
                    <th className="px-3 py-3">Trạng thái</th>
                    <th className="px-3 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
                  {promotions.map((promotion) => (
                    <tr key={promotion.promotionId}>
                      <td className="px-3 py-3 font-semibold">{promotion.code}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">{promotion.title}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">{promotion.customerTier}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">{promotion.discountValue} {promotion.discountType}</td>
                      <td className="px-3 py-3"><StatusPill value={promotion.status} /></td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-800" onClick={() => startEdit(promotion)} type="button" aria-label="Sửa khuyến mãi">
                            <FiEdit2 size={16} />
                          </button>
                          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-800" disabled={archiveMutation.isPending || promotion.status === "archived"} onClick={() => setPendingArchiveId(promotion.promotionId)} type="button" aria-label="Lưu trữ khuyến mãi">
                            <FiArchive size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </InternalPanel>
      </div>

      <ConfirmModal
        confirmLabel="Lưu trữ"
        description="Khuyến mãi sẽ chuyển sang trạng thái archived và không còn áp dụng trong luồng hiện tại."
        open={pendingArchiveId !== null}
        onCancel={() => setPendingArchiveId(null)}
        onConfirm={() => {
          if (pendingArchiveId) {
            archiveMutation.mutate(pendingArchiveId);
          }
        }}
        title="Lưu trữ khuyến mãi?"
      />
    </div>
  );
}
