"use client";

import { useRef } from "react";
import { FiChevronLeft, FiChevronRight, FiCornerDownRight } from "react-icons/fi";

type PaginationControlProps = {
  canGoNext: boolean;
  canGoPrevious: boolean;
  currentPage: number;
  disabled?: boolean;
  itemLabel?: string;
  onGoNext: () => void;
  onGoPrevious: () => void;
  onPageSubmit: (page: number) => void;
  pageSize: number;
};

export function PaginationControl({
  canGoNext,
  canGoPrevious,
  currentPage,
  disabled = false,
  itemLabel = "item",
  onGoNext,
  onGoPrevious,
  onPageSubmit,
  pageSize,
}: PaginationControlProps) {
  const pageInputRef = useRef<HTMLInputElement>(null);

  const submitPage = () => {
    const nextPage = Number.parseInt(pageInputRef.current?.value ?? "", 10);

    if (!Number.isFinite(nextPage) || nextPage < 1 || nextPage === currentPage) {
      if (pageInputRef.current) {
        pageInputRef.current.value = String(currentPage);
      }
      return;
    }

    onPageSubmit(nextPage);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500 dark:text-neutral-400">
        Trang <span className="font-bold text-slate-800 dark:text-neutral-200">{currentPage}</span>, tối đa {pageSize} {itemLabel}/trang.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
          disabled={!canGoPrevious || disabled}
          onClick={onGoPrevious}
          type="button"
        >
          <FiChevronLeft size={16} />
          Trước
        </button>
        <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 text-sm font-semibold text-slate-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200">
          <span>Đến trang</span>
          <input
            className="h-7 w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 text-center text-sm font-bold outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-neutral-950"
            defaultValue={currentPage}
            inputMode="numeric"
            key={currentPage}
            min={1}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submitPage();
              }
            }}
            ref={pageInputRef}
            type="number"
          />
        </label>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-200 px-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-sky-950/40"
          disabled={disabled}
          onClick={submitPage}
          type="button"
        >
          <FiCornerDownRight size={16} />
          Đi
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950"
          disabled={!canGoNext || disabled}
          onClick={onGoNext}
          type="button"
        >
          Sau
          <FiChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
