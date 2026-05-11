"use client";

import Image from "next/image";
import { useEffect } from "react";
import { FiEye, FiStar, FiTrash2, FiX } from "react-icons/fi";

import type { InternalVehicleCatalogItem } from "@/lib/shared/internal";

import type { VehicleImagePreviewState } from "./vehicle-catalog-types";

export function VehicleSelectedImagePreview({
  fileName,
  isCover = false,
  onOpenPreview,
  onRemove,
  onSetCover,
  previewUrl,
}: {
  fileName: string;
  isCover?: boolean;
  onOpenPreview: () => void;
  onRemove?: () => void;
  onSetCover?: () => void;
  previewUrl: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-sky-200 bg-sky-50/70 dark:border-sky-900 dark:bg-sky-950/20">
      <div className="flex items-center justify-between gap-3 border-b border-sky-200/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sky-700 dark:border-sky-900 dark:text-sky-300">
        <span>Xem trước ảnh mới</span>
        <span className="truncate">{fileName}</span>
      </div>
      <Image
        alt={fileName}
        className="object-cover"
        height={240}
        src={previewUrl}
        style={{ height: "15rem", width: "100%" }}
        unoptimized
        width={720}
      />
      {isCover ? (
        <div className="mx-3 mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
          <FiStar size={12} />
          Cover nháp
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 p-3">
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-sky-200 bg-white px-3 text-xs font-semibold text-sky-700 transition hover:-translate-y-0.5 dark:border-sky-900 dark:bg-neutral-950 dark:text-sky-300"
          onClick={onOpenPreview}
          type="button"
        >
          <FiEye size={14} />
          Xem
        </button>
        {onSetCover ? (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-900"
            disabled={isCover}
            onClick={onSetCover}
            type="button"
          >
            <FiStar size={14} />
            Đặt cover
          </button>
        ) : null}
        {onRemove ? (
          <button
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:bg-neutral-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
            onClick={onRemove}
            type="button"
          >
            <FiTrash2 size={14} />
            Gỡ ảnh
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function VehicleImagePreview({
  item,
  onOpenPreview,
}: {
  item: InternalVehicleCatalogItem;
  onOpenPreview?: () => void;
}) {
  if (!item.imageUrl) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm font-semibold text-slate-400 dark:border-neutral-800 dark:bg-neutral-950/40">
        Chưa có ảnh phương tiện
      </div>
    );
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800">
      <Image alt={item.label} className="object-cover" fill sizes="(min-width: 1280px) 42vw, 100vw" src={item.imageUrl} />
      {onOpenPreview ? (
        <button
          className="absolute bottom-3 right-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/90 px-3 text-sm font-semibold text-slate-800 shadow-lg transition hover:-translate-y-0.5 dark:bg-black/80 dark:text-neutral-50"
          onClick={onOpenPreview}
          type="button"
        >
          <FiEye size={16} />
          Xem
        </button>
      ) : null}
    </div>
  );
}

export function VehicleImagePreviewModal({
  onClose,
  preview,
}: {
  onClose: () => void;
  preview: VehicleImagePreviewState;
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
