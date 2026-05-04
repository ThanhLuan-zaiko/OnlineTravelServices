"use client";

import Image from "next/image";
import { FiAlertTriangle, FiImage, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import type { Dispatch, SetStateAction } from "react";

import { ImageDropzone } from "@/components/ui/image-dropzone";
import { SelectField } from "@/components/ui/select-field";
import type { InternalDestination, InternalDestinationMedia } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";

type DestinationManagerMediaProps = {
  draftCreationError: { details?: string; message: string } | null;
  deletePending: boolean;
  editingDestination: InternalDestination | null;
  isCover: boolean;
  media: InternalDestinationMedia[];
  mediaTitle: string;
  mediaType: string;
  onDelete: (mediaId: string) => void;
  onSelectFile: (file: File | null) => void;
  onSetCover: (mediaId: string) => void;
  onRetryDraft: () => void;
  onTitleChange: Dispatch<SetStateAction<string>>;
  onTypeChange: Dispatch<SetStateAction<string>>;
  onUpload: () => void;
  selectedFile: File | null;
  retryDraftPending: boolean;
  setCoverPending: boolean;
  setIsCover: Dispatch<SetStateAction<boolean>>;
  uploadPending: boolean;
};

function mediaFolderLabel(mediaUrl: string) {
  return mediaUrl.split("/").slice(0, 4).join("/");
}

export function DestinationManagerMedia({
  draftCreationError,
  deletePending,
  editingDestination,
  isCover,
  media,
  mediaTitle,
  mediaType,
  onDelete,
  onSelectFile,
  onSetCover,
  onRetryDraft,
  onTitleChange,
  onTypeChange,
  onUpload,
  selectedFile,
  retryDraftPending,
  setCoverPending,
  setIsCover,
  uploadPending,
}: DestinationManagerMediaProps) {
  const mediaTypeOptions = [
    { label: "image", value: "image" },
    { label: "cover", value: "cover" },
    { label: "gallery", value: "gallery" },
  ];

  return (
    <>
      <InternalPanel className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Tải ảnh 4K</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
              Ảnh sẽ được chuẩn hóa bằng Sharp, lưu riêng trong `public/uploads/destinations/...`.
            </p>
          </div>
          <StatusPill value={media.length > 0 ? "published" : "draft"} />
        </div>

        {editingDestination ? (
          <div className="mt-4 grid gap-4">
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
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-neutral-800">
                <input checked={isCover} onChange={(event) => setIsCover(event.target.checked)} type="checkbox" />
                Đặt làm ảnh đại diện
              </label>
            </div>
            <ImageDropzone disabled={uploadPending} file={selectedFile} label="Chọn file ảnh" onFileChange={onSelectFile} />
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950"
              disabled={uploadPending || !selectedFile}
              onClick={onUpload}
              type="button"
            >
              <FiImage size={17} />
              Tải ảnh lên
            </button>
          </div>
        ) : draftCreationError ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-950 dark:bg-rose-950/30">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 ring-1 ring-rose-200 dark:bg-neutral-950 dark:text-rose-300 dark:ring-rose-900">
                <FiAlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-rose-950 dark:text-rose-100">Không thể tạo bản nháp</p>
                <p className="mt-2 text-sm leading-6 text-rose-900/80 dark:text-rose-200">
                  {draftCreationError.message}
                </p>
                {draftCreationError.details ? (
                  <p className="mt-2 break-words text-xs leading-5 text-rose-800/70 dark:text-rose-200/80">
                    {draftCreationError.details}
                  </p>
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
                  <p className="flex items-center text-xs font-medium text-rose-900/70 dark:text-rose-200/75">
                    Hãy kiểm tra lại vị trí hoặc kết nối mạng nếu lỗi vẫn lặp lại.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState message="Chọn vị trí trên bản đồ để tạo bản nháp rồi tải ảnh lên ngay." />
        )}
      </InternalPanel>

      <InternalPanel className="p-4">
        <div className="flex items-center gap-2">
          <FiImage className="text-slate-400" size={18} />
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Media của địa điểm</h3>
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
          <EmptyState message="Chọn một địa điểm để xem media." />
        )}
      </InternalPanel>
    </>
  );
}
