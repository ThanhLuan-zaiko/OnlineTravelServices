"use client";

import { FiArchive, FiSave } from "react-icons/fi";
import type { Dispatch, FormEvent, SetStateAction } from "react";

import { SelectField } from "@/components/ui/select-field";
import { InternalPanel, StatusPill } from "./internal-primitives";
import type { DestinationMutationRequest, InternalDestination } from "@/lib/shared/internal";

type DestinationManagerEditorProps = {
  archivePending: boolean;
  editingDestination: InternalDestination | null;
  errors: Partial<Record<keyof DestinationMutationRequest, string>> & { searchKeywords?: string };
  form: DestinationMutationRequest;
  keywordsText: string;
  onArchive: () => void;
  onReset: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  savePending: boolean;
  setForm: Dispatch<SetStateAction<DestinationMutationRequest>>;
  setKeywordsText: Dispatch<SetStateAction<string>>;
};

export function DestinationManagerEditor({
  archivePending,
  editingDestination,
  errors,
  form,
  keywordsText,
  onArchive,
  onReset,
  onSubmit,
  savePending,
  setForm,
  setKeywordsText,
}: DestinationManagerEditorProps) {
  const popularityScore = Number.isFinite(form.popularityScore) ? form.popularityScore : 0;
  const statusOptions = [
    { label: "draft", value: "draft" },
    { label: "published", value: "published" },
    { label: "archived", value: "archived" },
  ];

  return (
    <InternalPanel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">
            {editingDestination ? "Cập nhật địa điểm" : "Tạo địa điểm"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Chọn vị trí trên bản đồ hoặc tìm kiếm để lấy kinh độ/vĩ độ và địa chỉ.
          </p>
        </div>
        {editingDestination ? <StatusPill value={editingDestination.status} /> : null}
      </div>

      <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Tên địa điểm</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700 outline-none transition read-only:cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              readOnly
              value={form.name}
            />
            {errors.name ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.name}</p> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Danh mục</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            />
            {errors.category ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.category}</p> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Quốc gia</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700 outline-none transition read-only:cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              readOnly
              value={form.country}
            />
            {errors.country ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.country}</p> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Khu vực</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700 outline-none transition read-only:cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              readOnly
              value={form.region}
            />
            {errors.region ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.region}</p> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Thành phố</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700 outline-none transition read-only:cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              readOnly
              value={form.city}
            />
            {errors.city ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.city}</p> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Mức an toàn</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
              value={form.safetyLevel}
              onChange={(event) => setForm((current) => ({ ...current, safetyLevel: event.target.value }))}
            />
            {errors.safetyLevel ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.safetyLevel}</p> : null}
          </label>
          <SelectField
            label="Trạng thái"
            name="destination-status"
            error={errors.status}
            onValueChange={(value) => setForm((current) => ({ ...current, status: value as DestinationMutationRequest["status"] }))}
            options={statusOptions}
            placeholder="Chọn trạng thái"
            value={form.status}
          />
          <label className="space-y-2">
            <span className="text-sm font-semibold">Điểm phổ biến</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
              type="number"
              value={popularityScore}
              onChange={(event) => setForm((current) => ({ ...current, popularityScore: Number(event.target.value) }))}
            />
            {errors.popularityScore ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.popularityScore}</p> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Vĩ độ</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700 outline-none transition read-only:cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              step="0.000001"
              readOnly
              type="number"
              value={form.latitude}
            />
            {errors.latitude ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.latitude}</p> : null}
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Kinh độ</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700 outline-none transition read-only:cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
              step="0.000001"
              readOnly
              type="number"
              value={form.longitude}
            />
            {errors.longitude ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.longitude}</p> : null}
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold">Địa chỉ</span>
          <input
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm text-slate-700 outline-none transition read-only:cursor-not-allowed dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
            readOnly
            value={form.address ?? ""}
          />
          {errors.address ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.address}</p> : null}
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">Mô tả</span>
          <textarea
            className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black"
            value={form.description ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold">Từ khóa tìm kiếm</span>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black"
            placeholder="Mỗi dòng một từ khóa"
            value={keywordsText}
            onChange={(event) => setKeywordsText(event.target.value)}
          />
          {errors.searchKeywords ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{errors.searchKeywords}</p> : null}
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={savePending}
            type="submit"
          >
            <FiSave size={17} />
            Lưu địa điểm
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
            onClick={onReset}
            type="button"
          >
            Làm mới
          </button>
          {editingDestination ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
              disabled={archivePending}
              onClick={onArchive}
              type="button"
            >
              <FiArchive size={17} />
              Lưu trữ
            </button>
          ) : null}
        </div>
      </form>
    </InternalPanel>
  );
}
