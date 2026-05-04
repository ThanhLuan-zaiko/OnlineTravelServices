"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle, FiX } from "react-icons/fi";

type ConfirmModalProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function ConfirmModal({
  cancelLabel = "Ở lại",
  confirmLabel = "Rời trang",
  description,
  open,
  onCancel,
  onConfirm,
  title,
}: ConfirmModalProps) {
  const uid = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="ui-confirm-modal-backdrop fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-md">
      <div
        aria-describedby={`${uid}-description`}
        aria-labelledby={`${uid}-title`}
        aria-modal="true"
        className="ui-confirm-modal-card relative w-full max-w-[28rem] rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_24px_80px_-20px_rgba(15,23,42,0.32)] ring-1 ring-white/60 backdrop-blur-xl dark:border-neutral-800/80 dark:bg-neutral-950/95 dark:ring-white/5"
        role="alertdialog"
      >
        <button
          aria-label="Đóng hộp thoại"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 dark:hover:text-neutral-50"
          onClick={onCancel}
          type="button"
        >
          <FiX size={16} />
        </button>

        <div className="flex items-start gap-4 pr-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-950/45 dark:text-amber-300 dark:ring-amber-900/70">
            <FiAlertTriangle size={21} />
          </div>
          <div className="space-y-2">
            <p className="text-base font-semibold tracking-tight text-slate-950 dark:text-neutral-50" id={`${uid}-title`}>
              {title}
            </p>
            <p className="whitespace-pre-line text-sm leading-6 text-slate-600 dark:text-neutral-400" id={`${uid}-description`}>
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:border-neutral-700 dark:hover:bg-neutral-900"
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-4 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 hover:shadow-rose-500/30"
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
