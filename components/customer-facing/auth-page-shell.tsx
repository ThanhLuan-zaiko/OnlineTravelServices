import Link from "next/link";
import type { ReactNode } from "react";
import { FiCheckCircle, FiCompass, FiMapPin } from "react-icons/fi";

import { AuthAlternateLink, AuthExitButton } from "./auth-exit-button";

type AuthPageShellProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  alternateAction: {
    label: string;
    href: string;
    text: string;
  };
};

export function AuthPageShell({
  alternateAction,
  children,
  description,
  eyebrow,
  highlights,
  title,
}: AuthPageShellProps) {
  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,transparent_34%),linear-gradient(135deg,#ffffff_0%,#f8fafc_52%,#ecfdf5_100%)] text-slate-950 dark:bg-[radial-gradient(circle_at_top_left,#082f49_0,transparent_34%),linear-gradient(135deg,#000000_0%,#0a0a0a_56%,#022c22_100%)] dark:text-neutral-50">
      <div className="mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100"
              href="/"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
                <FiCompass size={18} />
              </span>
              Online Travel Services
            </Link>
            <AuthExitButton />
          </div>
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1.5 text-sm font-semibold uppercase tracking-wider text-sky-700 shadow-sm dark:border-sky-900 dark:bg-black/40 dark:text-sky-300">
              <FiMapPin size={16} />
              {eyebrow}
            </div>
            <h1 className="text-4xl font-semibold leading-tight text-slate-950 dark:text-neutral-50 sm:text-5xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-neutral-400">
              {description}
            </p>
          </div>
          <div className="grid gap-3 text-sm font-medium text-slate-700 dark:text-neutral-300 sm:grid-cols-2">
            {highlights.map((highlight) => (
              <div
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white/75 px-4 py-3 shadow-sm dark:border-neutral-800 dark:bg-black/35"
                key={highlight}
              >
                <FiCheckCircle className="shrink-0 text-emerald-600 dark:text-emerald-300" size={18} />
                <span>{highlight}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            {alternateAction.text}{" "}
            <AuthAlternateLink
              className="font-semibold text-emerald-700 transition hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100"
              href={alternateAction.href}
              label={alternateAction.label}
            />
          </p>
        </section>

        <section className="w-full rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 dark:shadow-black/40 sm:p-7">
          {children}
        </section>
      </div>
    </main>
  );
}
