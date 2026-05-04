import type { ReactNode } from "react";

export function InternalPageHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-semibold tracking-normal text-slate-950 dark:text-neutral-50">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-neutral-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function InternalPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white dark:border-neutral-900 dark:bg-black ${className}`}>
      {children}
    </section>
  );
}

export function StatusPill({ value }: { value: string }) {
  const tone =
    value === "published" || value === "open"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
      : value === "draft" || value === "scheduled" || value === "pending"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
        : "border-slate-200 bg-slate-50 text-slate-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300";

  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${tone}`}>
      {value}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm font-medium text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
      {message}
    </div>
  );
}
