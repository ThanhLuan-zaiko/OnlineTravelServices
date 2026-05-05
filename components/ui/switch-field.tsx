"use client";

import { useId } from "react";

type SwitchFieldProps = {
  className?: string;
  checked: boolean;
  disabled?: boolean;
  description?: string;
  label: string;
  name: string;
  onCheckedChange: (checked: boolean) => void;
};

export function SwitchField({
  className = "",
  checked,
  disabled = false,
  description,
  label,
  name,
  onCheckedChange,
}: SwitchFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3 dark:border-neutral-800 ${disabled ? "opacity-70" : ""} ${className}`}
    >
      <div className="min-w-0">
        <label className="text-sm font-semibold text-slate-950 dark:text-neutral-50" id={labelId} htmlFor={id}>
          {label}
        </label>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-neutral-400" id={descriptionId}>
            {description}
          </p>
        ) : null}
      </div>

      <button
        aria-checked={checked}
        aria-describedby={descriptionId}
        aria-labelledby={labelId}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition outline-none ${
          checked
            ? "border-emerald-500 bg-emerald-500"
            : "border-slate-300 bg-slate-200 dark:border-neutral-700 dark:bg-neutral-800"
        } ${
          disabled
            ? "cursor-not-allowed"
          : "cursor-pointer focus-visible:ring-4 focus-visible:ring-emerald-500/15"
        }`}
        id={id}
        disabled={disabled}
        name={name}
        onClick={() => {
          if (!disabled) {
            onCheckedChange(!checked);
          }
        }}
        role="switch"
        type="button"
      >
        <span
          className={`ml-0.5 inline-flex h-6 w-6 rounded-full bg-white shadow-sm transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
