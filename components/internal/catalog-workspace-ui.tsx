"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { FiEye, FiImage, FiSearch, FiStar, FiTrash2, FiUploadCloud, FiX } from "react-icons/fi";

import { ImageDropzone } from "@/components/ui/image-dropzone";
import { PaginationControl } from "@/components/ui/pagination-control";
import { SelectField, type SelectOption } from "@/components/ui/select-field";

import { EmptyState, InternalPanel } from "./internal-primitives";

export type WorkspaceTab = {
  href: string;
  icon: IconType;
  label: string;
};

export type MediaItem = {
  isCover?: boolean;
  mediaId: string;
  mediaUrl: string;
  thumbnailUrl: string;
  title: string | null;
};

type ImagePreview = {
  alt: string;
  src: string;
} | null;

export const pageSizeOptions = [
  { label: "6 items", value: "6" },
  { label: "8 items", value: "8" },
  { label: "12 items", value: "12" },
  { label: "24 items", value: "24" },
];

export function WorkspaceTabs({ pathname, tabs }: { pathname: string; tabs: WorkspaceTab[] }) {
  return (
    <InternalPanel className="p-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                active
                  ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-800 dark:bg-black dark:text-neutral-300 dark:hover:bg-neutral-900"
              }`}
              href={tab.href}
              key={tab.href}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </InternalPanel>
  );
}

export function ListFilters({
  children,
  pageSize,
  searchQuery,
  setPageSize,
  setSearchQuery,
}: {
  children?: React.ReactNode;
  pageSize: number;
  searchQuery: string;
  setPageSize: (value: number) => void;
  setSearchQuery: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {children}
        <SelectField
          buttonClassName="h-10 px-3 text-sm font-semibold"
          label="Số item/trang"
          name="workspace-page-size"
          onValueChange={(value) => setPageSize(Number(value))}
          options={pageSizeOptions}
          placeholder="Số item"
          value={String(pageSize)}
        />
      </div>
      <label className="relative block">
        <span className="sr-only">Tìm kiếm</span>
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm theo tên, mã, trạng thái, ID..."
          value={searchQuery}
        />
      </label>
    </div>
  );
}

export function WorkspacePagination({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  isPaging,
  itemLabel,
  onJumpToPage,
  onNextPage,
  onPreviousPage,
  pageSize,
  visible,
}: {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isPaging: boolean;
  itemLabel: string;
  onJumpToPage: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pageSize: number;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4 dark:border-neutral-800">
      <PaginationControl
        canGoNext={hasNextPage}
        canGoPrevious={hasPreviousPage}
        currentPage={currentPage}
        disabled={isPaging}
        itemLabel={itemLabel}
        onGoNext={onNextPage}
        onGoPrevious={onPreviousPage}
        onPageSubmit={onJumpToPage}
        pageSize={pageSize}
      />
    </div>
  );
}

export function Thumb({
  alt,
  thumbnailUrl,
}: {
  alt: string;
  thumbnailUrl: string | null;
}) {
  return (
    <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-neutral-900">
      {thumbnailUrl ? (
        <Image alt={alt} className="object-cover" fill sizes="144px" src={thumbnailUrl} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-400">
          <FiImage size={22} />
        </div>
      )}
    </div>
  );
}

function useObjectUrl(file: File) {
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return previewUrl;
}

function DraftImagePreviewModal({
  onClose,
  preview,
}: {
  onClose: () => void;
  preview: ImagePreview;
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
        <div className="absolute left-4 top-4 z-10 max-w-[70%] truncate rounded-full bg-black/55 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
          {preview.alt}
        </div>
        <Image
          alt={preview.alt}
          className="max-h-[82vh] object-contain"
          height={1200}
          src={preview.src}
          style={{ height: "auto", width: "100%" }}
          unoptimized
          width={1800}
        />
      </div>
    </div>
  );
}

export function DraftMediaPreviewGrid({
  files,
  onFilesChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const [preview, setPreview] = useState<ImagePreview>(null);

  if (files.length === 0) {
    return null;
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, currentIndex) => currentIndex !== index));
  };

  const setCover = (index: number) => {
    const coverFile = files[index];

    if (!coverFile) {
      return;
    }

    onFilesChange([coverFile, ...files.filter((_, currentIndex) => currentIndex !== index)]);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-neutral-400">
            Ảnh nháp chỉ lưu trong trình duyệt cho đến khi bạn bấm lưu hoặc upload.
          </p>
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
            onClick={() => onFilesChange([])}
            type="button"
          >
            <FiTrash2 size={14} />
            Gỡ tất cả
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {files.map((file, index) => {
            const isCover = index === 0;

            return (
              <DraftMediaPreviewCard
                file={file}
                isCover={isCover}
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                onOpenPreview={setPreview}
                onRemove={() => removeFile(index)}
                onSetCover={() => setCover(index)}
              />
            );
          })}
        </div>
      </div>
      <DraftImagePreviewModal onClose={() => setPreview(null)} preview={preview} />
    </>
  );
}

function DraftMediaPreviewCard({
  file,
  isCover,
  onOpenPreview,
  onRemove,
  onSetCover,
}: {
  file: File;
  isCover: boolean;
  onOpenPreview: (preview: Exclude<ImagePreview, null>) => void;
  onRemove: () => void;
  onSetCover: () => void;
}) {
  const previewUrl = useObjectUrl(file);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800">
      <div className="relative aspect-video bg-slate-100 dark:bg-neutral-900">
        <Image alt={file.name} className="object-cover" fill sizes="(min-width: 768px) 28vw, 100vw" src={previewUrl} unoptimized />
        {isCover ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
            <FiStar size={12} />
            Cover nháp
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">{file.name}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{Math.ceil(file.size / 1024)} KB</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
            onClick={() => onOpenPreview({ alt: file.name, src: previewUrl })}
            type="button"
          >
            <FiEye size={13} />
            Xem
          </button>
          <button
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2 text-xs font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:hover:bg-neutral-900"
            disabled={isCover}
            onClick={onSetCover}
            type="button"
          >
            <FiStar size={13} />
            Đặt cover
          </button>
          <button
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-rose-200 px-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
            onClick={onRemove}
            type="button"
          >
            <FiTrash2 size={13} />
            Gỡ ảnh
          </button>
        </div>
      </div>
    </article>
  );
}

export function MediaPanel({
  disabled,
  emptyLabel,
  fileSelectionDisabled,
  media,
  mediaPending,
  onDeleteMedia,
  onSelectFiles,
  onSetCover,
  onUpload,
  selectedFiles,
  targetLabel,
  uploadDisabled,
  uploadPending,
}: {
  disabled: boolean;
  emptyLabel: string;
  fileSelectionDisabled?: boolean;
  media: MediaItem[];
  mediaPending: boolean;
  onDeleteMedia: (media: MediaItem) => void;
  onSelectFiles: (files: File[]) => void;
  onSetCover: (media: MediaItem) => void;
  onUpload: () => void;
  selectedFiles: File[];
  targetLabel: string;
  uploadDisabled?: boolean;
  uploadPending: boolean;
}) {
  const isFileSelectionDisabled = fileSelectionDisabled ?? disabled;
  const isUploadDisabled = uploadDisabled ?? disabled;
  const addFiles = (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    onSelectFiles([...selectedFiles, ...files]);
  };

  return (
    <InternalPanel className="p-4">
      <div className="flex items-center gap-2">
        <FiImage className="text-slate-400" size={16} />
        <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">{targetLabel}</h3>
      </div>
      <div className="mt-4 space-y-4">
        <DraftMediaPreviewGrid files={selectedFiles} onFilesChange={onSelectFiles} />
        {mediaPending ? (
          <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-neutral-800">Đang tải gallery...</div>
        ) : media.length === 0 ? (
          <EmptyState message={emptyLabel} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {media.map((item) => (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800" key={item.mediaId}>
                <div className="relative aspect-video bg-slate-100 dark:bg-neutral-900">
                  <Image alt={item.title ?? "Ảnh"} className="object-cover" fill sizes="(min-width: 768px) 28vw, 100vw" src={item.thumbnailUrl} />
                  {item.isCover ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
                      <FiStar size={12} />
                      Cover
                    </span>
                  ) : null}
                </div>
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
        )}
        <ImageDropzone
          disabled={isFileSelectionDisabled}
          file={selectedFiles}
          label="Chọn ảnh"
          multiple
          onFileChange={(file) => {
            if (file) {
              addFiles([file]);
            }
          }}
          onFilesChange={addFiles}
        />
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950"
          disabled={isUploadDisabled || selectedFiles.length === 0 || uploadPending}
          onClick={onUpload}
          type="button"
        >
          <FiUploadCloud size={17} />
          Upload {selectedFiles.length > 0 ? `${selectedFiles.length} ảnh` : "ảnh"}
        </button>
      </div>
    </InternalPanel>
  );
}

export function InlineSelect({
  label,
  name,
  onChange,
  options,
  value,
}: {
  label: string;
  name: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  value: string;
}) {
  return (
    <SelectField
      buttonClassName="h-10 px-3 text-sm font-semibold"
      label={label}
      name={name}
      onValueChange={onChange}
      options={options}
      placeholder="Tất cả"
      value={value}
    />
  );
}
