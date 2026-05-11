"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { FiImage, FiSave, FiStar, FiTrash2 } from "react-icons/fi";

import { ImageDropzone } from "@/components/ui/image-dropzone";
import { SelectField } from "@/components/ui/select-field";
import type { InternalVehicleCatalogItem, InternalVehicleCatalogMedia, VehicleCatalogMutationRequest } from "@/lib/shared/internal";

import { InternalPanel } from "./internal-primitives";
import { VehicleImagePreview, VehicleImagePreviewModal, VehicleSelectedImagePreview } from "./vehicle-catalog-preview";
import type { VehicleCatalogManagerState, VehicleImagePreviewState } from "./vehicle-catalog-types";

export function VehicleManageSection({
  editingItem,
  form,
  formErrors,
  onSelectFile,
  onSelectFiles,
  onSetCover,
  onDeleteMedia,
  onSubmit,
  resetForm,
  savePending,
  selectedFilePreviews,
  selectedFiles,
  setForm,
  media,
  mediaPending,
}: {
  editingItem: InternalVehicleCatalogItem | null;
  form: VehicleCatalogMutationRequest;
  formErrors: Partial<Record<keyof VehicleCatalogMutationRequest, string>>;
  onSelectFile: (file: File | null) => void;
  onSelectFiles: (files: File[]) => void;
  onSetCover: (media: InternalVehicleCatalogMedia) => void;
  onDeleteMedia: (media: InternalVehicleCatalogMedia) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  resetForm: () => void;
  savePending: boolean;
  selectedFilePreviews: Array<{ file: File; previewUrl: string }>;
  selectedFiles: File[];
  setForm: VehicleCatalogManagerState["setForm"];
  media: InternalVehicleCatalogMedia[];
  mediaPending: boolean;
}) {
  const imageLabel = editingItem ? "Đổi ảnh khi lưu" : "Ảnh phương tiện";
  const [imagePreview, setImagePreview] = useState<VehicleImagePreviewState>(null);
  const addFiles = (files: File[]) => {
    if (files.length > 0) {
      onSelectFiles([...selectedFiles, ...files]);
    }
  };
  const removeFile = (index: number) => onSelectFiles(selectedFiles.filter((_, currentIndex) => currentIndex !== index));
  const setDraftCover = (index: number) => {
    const coverFile = selectedFiles[index];

    if (!coverFile) {
      return;
    }

    onSelectFiles([coverFile, ...selectedFiles.filter((_, currentIndex) => currentIndex !== index)]);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <InternalPanel className="p-4">
        <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">
          {editingItem ? "Cập nhật phương tiện" : "Tạo phương tiện"}
        </h3>
        <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-semibold">Tên hiển thị</span>
              <input
                aria-describedby={formErrors.label ? "vehicle-label-error" : undefined}
                aria-invalid={formErrors.label ? true : undefined}
                className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition dark:bg-black ${
                  formErrors.label ? "border-rose-300 focus:border-rose-500 dark:border-rose-900" : "border-slate-200 dark:border-neutral-800"
                }`}
                value={form.label}
                onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              />
              {formErrors.label ? (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-300" id="vehicle-label-error">
                  {formErrors.label}
                </p>
              ) : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Loại phương tiện</span>
              <input
                aria-describedby={formErrors.vehicleType ? "vehicle-type-error" : undefined}
                aria-invalid={formErrors.vehicleType ? true : undefined}
                className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition dark:bg-black ${
                  formErrors.vehicleType ? "border-rose-300 focus:border-rose-500 dark:border-rose-900" : "border-slate-200 dark:border-neutral-800"
                }`}
                value={form.vehicleType}
                onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))}
              />
              {formErrors.vehicleType ? (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-300" id="vehicle-type-error">
                  {formErrors.vehicleType}
                </p>
              ) : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Dòng xe</span>
              <input
                aria-describedby={formErrors.vehicleModel ? "vehicle-model-error" : undefined}
                aria-invalid={formErrors.vehicleModel ? true : undefined}
                className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition dark:bg-black ${
                  formErrors.vehicleModel ? "border-rose-300 focus:border-rose-500 dark:border-rose-900" : "border-slate-200 dark:border-neutral-800"
                }`}
                value={form.vehicleModel}
                onChange={(event) => setForm((current) => ({ ...current, vehicleModel: event.target.value }))}
              />
              {formErrors.vehicleModel ? (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-300" id="vehicle-model-error">
                  {formErrors.vehicleModel}
                </p>
              ) : null}
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Số chỗ ngồi</span>
              <input
                aria-describedby={formErrors.vehicleCapacity ? "vehicle-capacity-error" : undefined}
                aria-invalid={formErrors.vehicleCapacity ? true : undefined}
                className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition dark:bg-black ${
                  formErrors.vehicleCapacity ? "border-rose-300 focus:border-rose-500 dark:border-rose-900" : "border-slate-200 dark:border-neutral-800"
                }`}
                min={1}
                type="number"
                value={form.vehicleCapacity}
                onChange={(event) => setForm((current) => ({ ...current, vehicleCapacity: Number(event.target.value) }))}
              />
              {formErrors.vehicleCapacity ? (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-300" id="vehicle-capacity-error">
                  {formErrors.vehicleCapacity}
                </p>
              ) : null}
            </label>
            <SelectField
              error={formErrors.status}
              label="Trạng thái"
              name="vehicle-catalog-status"
              onValueChange={(value) => setForm((current) => ({ ...current, status: value as VehicleCatalogMutationRequest["status"] }))}
              options={[
                { label: "active", value: "active" },
                { label: "inactive", value: "inactive" },
              ]}
              placeholder="Chọn trạng thái"
              value={form.status}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={savePending}
              type="submit"
            >
              <FiSave size={17} />
              {selectedFiles.length > 0 ? `Lưu và upload ${selectedFiles.length} ảnh` : "Lưu phương tiện"}
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
              onClick={resetForm}
              type="button"
            >
              Làm mới
            </button>
          </div>
        </form>
      </InternalPanel>

      <InternalPanel className="p-4">
        <div className="flex items-center gap-2">
          <FiImage className="text-slate-400" size={16} />
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">{imageLabel}</h3>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
          Có thể chọn ảnh ngay khi tạo mới; hệ thống sẽ lưu phương tiện rồi tự upload ảnh cho item vừa tạo.
        </p>
        <div className="mt-4 space-y-4">
          {selectedFilePreviews.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500 dark:text-neutral-400">
                  Ảnh nháp chỉ lưu trong trình duyệt cho đến khi bạn bấm lưu.
                </p>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  onClick={() => onSelectFiles([])}
                  type="button"
                >
                  <FiTrash2 size={14} />
                  Gỡ tất cả
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {selectedFilePreviews.map((item, index) => (
                  <VehicleSelectedImagePreview
                    fileName={item.file.name}
                    isCover={index === 0}
                    key={`${item.file.name}-${item.previewUrl}`}
                    previewUrl={item.previewUrl}
                    onOpenPreview={() => setImagePreview({ alt: item.file.name, src: item.previewUrl })}
                    onRemove={() => removeFile(index)}
                    onSetCover={() => setDraftCover(index)}
                  />
                ))}
              </div>
            </div>
          ) : null}
          {editingItem ? <VehicleImagePreview item={editingItem} /> : null}
          {editingItem ? (
            <VehicleCatalogMediaGallery
              media={media}
              mediaPending={mediaPending}
              onDeleteMedia={onDeleteMedia}
              onOpenPreview={(item) => setImagePreview({ alt: item.title ?? editingItem.label, src: item.mediaUrl })}
              onSetCover={onSetCover}
            />
          ) : null}
          <ImageDropzone
            disabled={savePending}
            file={selectedFiles}
            label="Chọn file ảnh"
            multiple
            onFileChange={(file) => {
              if (file) {
                addFiles([file]);
              } else {
                onSelectFile(null);
              }
            }}
            onFilesChange={addFiles}
          />
        </div>
      </InternalPanel>
      <VehicleImagePreviewModal onClose={() => setImagePreview(null)} preview={imagePreview} />
    </div>
  );
}

function VehicleCatalogMediaGallery({
  media,
  mediaPending,
  onDeleteMedia,
  onOpenPreview,
  onSetCover,
}: {
  media: InternalVehicleCatalogMedia[];
  mediaPending: boolean;
  onDeleteMedia: (media: InternalVehicleCatalogMedia) => void;
  onOpenPreview: (media: InternalVehicleCatalogMedia) => void;
  onSetCover: (media: InternalVehicleCatalogMedia) => void;
}) {
  if (mediaPending) {
    return <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-neutral-800">Đang tải gallery...</div>;
  }

  if (media.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-400 dark:border-neutral-800">
        Chưa có ảnh trong gallery.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {media.map((item) => (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800" key={item.mediaId}>
          <button className="relative block aspect-video w-full bg-slate-100 dark:bg-neutral-900" onClick={() => onOpenPreview(item)} type="button">
            <Image alt={item.title ?? "Ảnh phương tiện"} className="object-cover" fill sizes="(min-width: 768px) 22vw, 100vw" src={item.thumbnailUrl} />
            {item.isCover ? (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
                <FiStar size={12} />
                Cover
              </span>
            ) : null}
          </button>
          <div className="flex flex-wrap gap-2 p-2">
            <button
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2 text-xs font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:hover:bg-neutral-900"
              disabled={item.isCover}
              onClick={() => onSetCover(item)}
              type="button"
            >
              <FiStar size={13} />
              Đặt cover
            </button>
            <button
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-rose-200 px-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
              onClick={() => onDeleteMedia(item)}
              type="button"
            >
              <FiTrash2 size={13} />
              Xóa
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
