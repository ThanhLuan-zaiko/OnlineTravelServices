"use client";

import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

type PasswordFieldProps = {
  autoComplete: string;
  error?: string;
  intent?: "emerald" | "sky";
  label: string;
  minLength?: number;
  name: string;
  required?: boolean;
};

export function PasswordField({
  autoComplete,
  error,
  intent = "sky",
  label,
  minLength,
  name,
  required = false,
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const focusClass =
    intent === "emerald"
      ? "focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10"
      : "focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10";
  const errorId = `${name}-error`;

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-800 dark:text-neutral-200" htmlFor={name}>
        {label}
      </label>
      <div
        className={`flex h-12 items-center rounded-xl border bg-white transition dark:bg-black ${
          error
            ? "border-rose-300 focus-within:border-rose-500 focus-within:ring-4 focus-within:ring-rose-500/10 dark:border-rose-900"
            : `border-slate-200 dark:border-neutral-800 ${focusClass}`
        }`}
      >
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          className="h-full min-w-0 flex-1 rounded-xl bg-transparent px-4 text-sm font-medium text-slate-950 outline-none dark:text-neutral-50"
          id={name}
          minLength={minLength}
          name={name}
          required={required}
          type={isVisible ? "text" : "password"}
        />
        <button
          aria-label={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
          onClick={() => setIsVisible((current) => !current)}
          tabIndex={-1}
          type="button"
        >
          {isVisible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
        </button>
      </div>
      {error ? (
        <p className="text-sm font-medium text-rose-600 dark:text-rose-300" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
