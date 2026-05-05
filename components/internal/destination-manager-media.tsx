"use client";

import Image from "next/image";
import { FiAlertTriangle, FiEye, FiImage, FiPlus, FiRefreshCw, FiTrash2, FiX } from "react-icons/fi";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import { ImageDropzone } from "@/components/ui/image-dropzone";
import { SelectField } from "@/components/ui/select-field";
import { SwitchField } from "@/components/ui/switch-field";
import type { InternalDestination, InternalDestinationMedia } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";

type DraftMediaItem = {
  file: File;
  id: string;
  isCover: boolean;
  previewUrl: string;
};

type ImagePreviewState = {
  alt: string;
  src: string;
} | null;

type DestinationManagerMediaProps = {
  draftCreationError: { details?: string; message: string } | null;
  deletePending: boolean;
  destinationStatus: InternalDestination["status"] | null;
  draftMediaItems: DraftMediaItem[];
  editingDestination: InternalDestination | null;
  isCover: boolean;
  media: InternalDestinationMedia[];
  mediaTitle: string;
  mediaType: string;
  onAddDraftMediaItems: (files: File[]) => void;
  onClearDraftMediaItems: () => void;
  onDelete: (mediaId: string) => void;
  onRemoveDraftMediaItem: (itemId: string) => void;
  onRetryDraft: () => void;
  onSelectFile: (file: File | null) => void;
  onSetCover: (mediaId: string) => void;
  onSetDraftMediaCover: (itemId: string) => void;
  onTitleChange: Dispatch<SetStateAction<string>>;
  onTypeChange: Dispatch<SetStateAction<string>>;
  onUpload: () => void;
  retryDraftPending: boolean;
  selectedFile: File | null;
  selectedFilePreviewUrl: string | null;
  setCoverPending: boolean;
  setIsCover: Dispatch<SetStateAction<boolean>>;
  uploadPending: boolean;
};

function mediaFolderLabel(mediaUrl: string) {
  return mediaUrl.split("/").slice(0, 4).join("/");
}

function DraftPreviewGrid({
  draftMediaItems,
  onClearDraftMediaItems,
  onPreviewImage,
  onRemoveDraftMediaItem,
  onSetDraftMediaCover,
}: Pick<
  DestinationManagerMediaProps,
  "draftMediaItems" | "onClearDraftMediaItems" | "onRemoveDraftMediaItem" | "onSetDraftMediaCover"
> & {
  onPreviewImage: (preview: Exclude<ImagePreviewState, null>) => void;
}) {
  if (draftMediaItems.length === 0) {
    return <EmptyState message="Chưa có ảnh nháp nào. Hãy chọn nhiều file để xem preview." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-neutral-400">Ảnh nháp chỉ tồn tại trong trình duyệt cho đến khi bạn publish.</p>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
          onClick={onClearDraftMediaItems}
          type="button"
        >
          <FiTrash2 size={16} />
          Xóa tất cả
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {draftMediaItems.map((item) => (
          <article className="overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800" key={item.id}>
            <Image
              alt={item.file.name}
              className="object-cover"
              height={160}
              src={item.previewUrl}
              style={{ height: "10rem", width: "100%" }}
              unoptimized
              width={320}
            />
            <div className="space-y-2 p-3">
              <div>
                <p className="truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">{item.file.name}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{Math.ceil(item.file.size / 1024)} KB</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  onClick={() => onPreviewImage({ alt: item.file.name, src: item.previewUrl })}
                  type="button"
                >
                  <FiEye size={14} />
                  Xem
                </button>
                <button
                  className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${
                    item.isCover
                      ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                  }`}
                  onClick={() => onSetDraftMediaCover(item.id)}
                  type="button"
                >
                  <FiImage size={14} />
                  {item.isCover ? "Ảnh đại diện" : "Đặt làm ảnh đại diện"}
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  onClick={() => onRemoveDraftMediaItem(item.id)}
                  type="button"
                >
                  <FiTrash2 size={14} />
                  Xóa
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ImagePreviewModal({
  preview,
  onClose,
}: {
  preview: ImagePreviewState;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!preview) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, preview]);

  if (!preview) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/15 bg-black shadow-2xl">
        <button
          aria-label="Đóng xem ảnh"
          className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-950 shadow-lg transition hover:scale-105"
          onClick={onClose}
          type="button"
        >
          <FiX size={18} />
        </button>
        <div className="absolute left-4 top-4 z-10 max-w-[70%] rounded-full bg-black/55 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
          {preview.alt}
        </div>
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/90 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-800 shadow-lg">
          Nhấn Esc để thoát
        </div>
        <Image
          alt={preview.alt}
          className="max-h-[82vh] object-contain"
          height={1200}
          src={preview.src}
          style={{ height: "auto", width: "100%" }}
          unoptimized={preview.src.startsWith("blob:")}
          width={1800}
        />
      </div>
    </div>
  );
}

export function DestinationManagerMedia({
  draftCreationError,
  deletePending,
  destinationStatus,
  draftMediaItems,
  editingDestination,
  isCover,
  media,
  mediaTitle,
  mediaType,
  onAddDraftMediaItems,
  onClearDraftMediaItems,
  onDelete,
  onRemoveDraftMediaItem,
  onRetryDraft,
  onSelectFile,
  onSetCover,
  onSetDraftMediaCover,
  onTitleChange,
  onTypeChange,
  onUpload,
  retryDraftPending,
  selectedFile,
  selectedFilePreviewUrl,
  setCoverPending,
  setIsCover,
  uploadPending,
}: DestinationManagerMediaProps) {
  const [imagePreview, setImagePreview] = useState<ImagePreviewState>(null);
  const mediaTypeOptions = [
    { label: "image", value: "image" },
    { label: "cover", value: "cover" },
    { label: "gallery", value: "gallery" },
  ];

  const isDraftDestination = destinationStatus === null || destinationStatus === "draft";
  const isPublishedDestination = destinationStatus === "published";

  return (
    <>
      <InternalPanel className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">
              {isDraftDestination ? "Ảnh nháp để preview" : "Ảnh và media của địa điểm"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
              {isDraftDestination
                ? "Thêm nhiều ảnh để xem trước giao diện địa điểm trước khi publish."
                : "Ảnh đã lưu sẽ hiển thị ở đây và có thể đặt lại ảnh đại diện."}
            </p>
          </div>
          <StatusPill value={editingDestination ? editingDestination.status : "draft"} />
        </div>

        {editingDestination || isDraftDestination ? (
          <div className="mt-4 grid gap-4">
            {isDraftDestination ? (
              <>
                <ImageDropzone
                  accept="image/*"
                  disabled={uploadPending}
                  file={draftMediaItems.length > 0 ? draftMediaItems.map((item) => item.file) : null}
                  hint="Chọn nhiều ảnh để preview UI-only. Ảnh chỉ upload khi địa điểm được publish."
                  label="Chọn nhiều ảnh nháp"
                  multiple
                  onFileChange={onSelectFile}
                  onFilesChange={onAddDraftMediaItems}
                />
                <DraftPreviewGrid
                  draftMediaItems={draftMediaItems}
                  onClearDraftMediaItems={onClearDraftMediaItems}
                  onPreviewImage={setImagePreview}
                  onRemoveDraftMediaItem={onRemoveDraftMediaItem}
                  onSetDraftMediaCover={onSetDraftMediaCover}
                />
              </>
            ) : (
              <>
                {selectedFilePreviewUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/20">
                    <div className="flex items-center justify-between gap-3 border-b border-sky-200/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:border-sky-900 dark:text-sky-300">
                      <span>Xem trước ảnh mới</span>
                      <span>{selectedFile?.name ?? "Chưa có file"}</span>
                    </div>
                    <Image
                      alt={selectedFile?.name ?? editingDestination?.name ?? "Ảnh địa điểm"}
                      className="object-cover"
                      height={208}
                      src={selectedFilePreviewUrl}
                      style={{ height: "13rem", width: "100%" }}
                      unoptimized
                      width={640}
                    />
                    <button
                      className="m-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-700 transition hover:-translate-y-0.5 dark:border-sky-900 dark:bg-neutral-950 dark:text-sky-300"
                      onClick={() =>
                        selectedFilePreviewUrl
                          ? setImagePreview({
                              alt: selectedFile?.name ?? editingDestination?.name ?? "Ảnh địa điểm",
                              src: selectedFilePreviewUrl,
                            })
                          : undefined
                      }
                      type="button"
                    >
                      <FiEye size={16} />
                      Xem toàn cảnh
                    </button>
                  </div>
                ) : null}
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Tiêu đề ảnh</span>
                  <input
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                    value={mediaTitle}
                    onChange={(event) => onTitleChange(event.target.value)}
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Loại ảnh"
                    name="destination-media-type"
                    onValueChange={onTypeChange}
                    options={mediaTypeOptions}
                    placeholder="Chọn loại ảnh"
                    value={mediaType}
                  />
                  <SwitchField checked={isCover} className="md:self-end" label="Đặt làm ảnh đại diện" name="destination-media-is-cover" onCheckedChange={setIsCover} />
                </div>
                <ImageDropzone
                  disabled={uploadPending || !isPublishedDestination}
                  file={selectedFile}
                  label="Chọn file ảnh"
                  onFileChange={onSelectFile}
                />
                {!isPublishedDestination ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Chỉ có thể tải ảnh vật lý khi địa điểm đã ở trạng thái published.
                  </p>
                ) : null}
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950"
                  disabled={uploadPending || !selectedFile || !isPublishedDestination}
                  onClick={onUpload}
                  type="button"
                >
                  <FiPlus size={17} />
                  Tải ảnh lên
                </button>
              </>
            )}

            {draftCreationError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-950 dark:bg-rose-950/30">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 ring-1 ring-rose-200 dark:bg-neutral-950 dark:text-rose-300 dark:ring-rose-900">
                    <FiAlertTriangle size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-rose-950 dark:text-rose-100">Không thể tạo bản nháp</p>
                    <p className="mt-2 text-sm leading-6 text-rose-900/80 dark:text-rose-200">{draftCreationError.message}</p>
                    {draftCreationError.details ? (
                      <p className="mt-2 break-words text-xs leading-5 text-rose-800/70 dark:text-rose-200/80">{draftCreationError.details}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={retryDraftPending}
                        onClick={onRetryDraft}
                        type="button"
                      >
                        <FiRefreshCw className={retryDraftPending ? "animate-spin" : ""} size={16} />
                        {retryDraftPending ? "Đang thử lại..." : "Thử lại"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </InternalPanel>

      <InternalPanel className="p-4">
        <div className="flex items-center gap-2">
          <FiImage className="text-slate-400" size={18} />
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Media đã lưu</h3>
        </div>
        {editingDestination ? (
          media.length === 0 ? (
            <div className="mt-4">
              <EmptyState message="Chưa có ảnh nào cho địa điểm này." />
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {media.map((item: InternalDestinationMedia) => (
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800" key={item.mediaId}>
                  <Image alt={item.title ?? editingDestination.name} className="h-40 w-full object-cover" height={160} src={item.thumbnailUrl} width={320} />
                  <div className="space-y-2 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-neutral-50">{item.title ?? "Ảnh địa điểm"}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{mediaFolderLabel(item.mediaUrl)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                        onClick={() => setImagePreview({ alt: item.title ?? editingDestination.name, src: item.mediaUrl })}
                        type="button"
                      >
                        <FiEye size={14} />
                        Xem
                      </button>
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                        disabled={setCoverPending || item.mediaUrl === editingDestination.coverImageUrl}
                        onClick={() => onSetCover(item.mediaId)}
                        type="button"
                      >
                        <FiImage size={14} />
                        Đặt làm ảnh đại diện
                      </button>
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        disabled={deletePending}
                        onClick={() => onDelete(item.mediaId)}
                        type="button"
                      >
                        <FiTrash2 size={14} />
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <EmptyState message="Media đã lưu sẽ xuất hiện sau khi địa điểm được lưu vào DB và publish." />
        )}
      </InternalPanel>
      <ImagePreviewModal onClose={() => setImagePreview(null)} preview={imagePreview} />
    </>
  );
}
