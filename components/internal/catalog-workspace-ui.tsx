"use client";

import Image from "next/image";
import Link from "next/link";
import type { IconType } from "react-icons";
import { FiImage, FiSearch, FiStar, FiTrash2, FiUploadCloud } from "react-icons/fi";

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

export function MediaPanel({
  disabled,
  emptyLabel,
  media,
  mediaPending,
  onDeleteMedia,
  onSelectFiles,
  onSetCover,
  onUpload,
  selectedFiles,
  targetLabel,
  uploadPending,
}: {
  disabled: boolean;
  emptyLabel: string;
  media: MediaItem[];
  mediaPending: boolean;
  onDeleteMedia: (media: MediaItem) => void;
  onSelectFiles: (files: File[]) => void;
  onSetCover: (media: MediaItem) => void;
  onUpload: () => void;
  selectedFiles: File[];
  targetLabel: string;
  uploadPending: boolean;
}) {
  return (
    <InternalPanel className="p-4">
      <div className="flex items-center gap-2">
        <FiImage className="text-slate-400" size={16} />
        <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">{targetLabel}</h3>
      </div>
      <div className="mt-4 space-y-4">
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
          disabled={disabled}
          file={selectedFiles}
          label="Chọn ảnh"
          multiple
          onFileChange={(file) => onSelectFiles(file ? [file] : [])}
          onFilesChange={onSelectFiles}
        />
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950"
          disabled={disabled || selectedFiles.length === 0 || uploadPending}
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
