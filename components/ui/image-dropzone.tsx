"use client";

import { useId, useRef, useState, type DragEvent } from "react";
import { FiUploadCloud } from "react-icons/fi";

type ImageDropzoneProps = {
  accept?: string;
  disabled?: boolean;
  file: File | File[] | null;
  hint?: string;
  label: string;
  onFileChange: (file: File | null) => void;
  onFilesChange?: (files: File[]) => void;
  multiple?: boolean;
};

export function ImageDropzone({
  accept = "image/*",
  disabled = false,
  file,
  hint = "Hỗ trợ JPG, PNG, WebP. Kéo thả hoặc bấm để chọn ảnh.",
  multiple = false,
  label,
  onFileChange,
  onFilesChange,
}: ImageDropzoneProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectFile = (nextFile: File | null) => {
    if (disabled) {
      return;
    }

    onFileChange(nextFile);
  };

  const selectFiles = (nextFiles: File[]) => {
    if (disabled) {
      return;
    }

    if (onFilesChange) {
      onFilesChange(nextFiles);
      return;
    }

    selectFile(nextFiles[0] ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (disabled) {
      return;
    }

    setIsDragging(false);
    selectFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const fileName = Array.isArray(file)
    ? `${file.length} file đã chọn`
    : file?.name ?? "Chưa có file nào được chọn";
  const hasFile = Array.isArray(file) ? file.length > 0 : Boolean(file);

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-800 dark:text-neutral-200" htmlFor={id}>
        {label}
      </label>
      <div className="rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50 p-1 transition dark:border-neutral-800 dark:from-black dark:to-neutral-950">
        <button
          aria-describedby={`${id}-hint`}
          className={`flex min-h-28 w-full items-center gap-4 rounded-[0.95rem] px-4 py-4 text-left transition outline-none ${
            disabled
              ? "cursor-not-allowed opacity-60"
              : isDragging
                ? "border-sky-400 bg-sky-50 dark:bg-sky-950/25"
                : "hover:bg-slate-100/70 dark:hover:bg-neutral-900/70"
          }`}
          onClick={() => {
            if (!disabled) {
              inputRef.current?.click();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!disabled) {
              setIsDragging(true);
            }
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!disabled) {
              setIsDragging(false);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDrop={handleDrop}
          type="button"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950">
            <FiUploadCloud size={22} />
          </span>
          <span className="min-w-0 space-y-1">
            <span className="block text-sm font-semibold text-slate-950 dark:text-neutral-50">
              {hasFile ? fileName : "Kéo thả ảnh vào đây hoặc bấm để chọn file"}
            </span>
            <span className="block text-sm text-slate-500 dark:text-neutral-400" id={`${id}-hint`}>
              {hint}
            </span>
          </span>
        </button>
      </div>
      <input
        ref={inputRef}
        accept={accept}
        className="sr-only"
        id={id}
        multiple={multiple}
        onChange={(event) => {
          const nextFiles = Array.from(event.target.files ?? []);
          selectFiles(nextFiles);
          event.currentTarget.value = "";
        }}
        type="file"
      />
    </div>
  );
}
