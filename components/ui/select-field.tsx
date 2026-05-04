"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export type SelectOption = {
  label: string;
  value: string;
};

type SelectFieldProps = {
  buttonClassName?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  hideChevron?: boolean;
  hidePlaceholderOption?: boolean;
  intent?: "emerald" | "sky";
  label: string;
  labelClassName?: string;
  name: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  popoverClassName?: string;
  placeholder: string;
  renderValue?: (selectedOption: SelectOption | undefined) => ReactNode;
  value?: string;
};

export function SelectField({
  buttonClassName,
  className,
  disabled = false,
  error,
  hideChevron = false,
  hidePlaceholderOption = false,
  intent = "emerald",
  label,
  labelClassName,
  name,
  onValueChange,
  options,
  popoverClassName,
  placeholder,
  renderValue,
  value,
}: SelectFieldProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelectedValue, setInternalSelectedValue] = useState("");
  const selectedValue = value ?? internalSelectedValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const focusClass =
    intent === "emerald"
      ? "focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
      : "focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10";
  const errorId = `${name}-error`;

  const handleSelect = (nextValue: string) => {
    if (value === undefined) {
      setInternalSelectedValue(nextValue);
    }

    onValueChange?.(nextValue);
    setIsOpen(false);
  };

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div className={`relative space-y-2 ${className ?? ""}`} ref={rootRef}>
      <label
        className={labelClassName ?? "text-sm font-semibold text-slate-800 dark:text-neutral-200"}
        htmlFor={name}
      >
        {label}
      </label>
      <input
        aria-invalid={error ? true : undefined}
        name={name}
        type="hidden"
        value={selectedValue}
      />
      <button
        aria-describedby={error ? errorId : undefined}
        aria-controls={listboxId}
        aria-expanded={disabled ? false : isOpen}
        aria-haspopup="listbox"
        className={`flex h-12 w-full items-center justify-between rounded-xl border bg-white px-4 text-left text-sm font-semibold text-slate-950 outline-none transition dark:bg-black dark:text-neutral-50 ${
          error
            ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-900"
            : `border-slate-200 dark:border-neutral-800 ${focusClass}`
        } ${disabled ? "cursor-not-allowed opacity-70" : ""} ${buttonClassName ?? ""}`}
        id={name}
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current);
          }
        }}
        disabled={disabled}
        type="button"
      >
        <span className={selectedOption ? "" : "text-slate-500 dark:text-neutral-400"}>
          {renderValue ? renderValue(selectedOption) : (selectedOption?.label ?? placeholder)}
        </span>
        {hideChevron ? null : (
          <FiChevronDown
            className={`shrink-0 text-slate-500 transition dark:text-neutral-400 ${isOpen ? "rotate-180" : ""}`}
            size={18}
          />
        )}
      </button>

      {isOpen && !disabled ? (
        <div
          className={`absolute top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-200/70 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-black/40 ${popoverClassName ?? "left-0 right-0"}`}
          id={listboxId}
          role="listbox"
        >
          {hidePlaceholderOption ? null : (
            <button
              aria-selected={!selectedValue}
              className="flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
              onClick={() => handleSelect("")}
              role="option"
              type="button"
            >
              {placeholder}
              {!selectedValue ? <FiCheck className="text-emerald-600 dark:text-emerald-300" size={17} /> : null}
            </button>
          )}

          {options.map((option) => {
            const isSelected = selectedValue === option.value;

            return (
              <button
                aria-selected={isSelected}
                className={`flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium transition ${
                  isSelected
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
                }`}
                key={option.value}
                onClick={() => handleSelect(option.value)}
                role="option"
                type="button"
              >
                {option.label}
                {isSelected ? <FiCheck size={17} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-rose-600 dark:text-rose-300" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
