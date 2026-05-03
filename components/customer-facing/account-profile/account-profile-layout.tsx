"use client";

import type { ReactNode } from "react";
import { FiArrowLeft, FiMail } from "react-icons/fi";

import type { AccountProfile } from "@/lib/shared/auth";

type AccountProfileHeaderProps = {
  onBack: () => void;
  profile: AccountProfile;
};

type SectionPanelProps = {
  children: ReactNode;
  description?: string;
  icon: ReactNode;
  title: string;
};

type IconFieldProps = {
  autoComplete?: string;
  defaultValue?: string;
  error?: string;
  icon?: ReactNode;
  label: string;
  max?: string;
  name: string;
  type?: string;
};

export function AccountProfileHeader({ onBack, profile }: AccountProfileHeaderProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-300 dark:hover:border-sky-950 dark:hover:bg-neutral-900 dark:hover:text-sky-300"
            onClick={onBack}
            type="button"
          >
            <FiArrowLeft size={17} />
            Quay lại
          </button>
          <h1 className="mt-5 text-3xl font-bold text-slate-950 dark:text-neutral-50">
            Cập nhật tài khoản
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
            Quản lý thông tin liên hệ, hồ sơ cá nhân và bảo mật đăng nhập.
          </p>
        </div>

        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-neutral-800 dark:bg-black">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
            <FiMail size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-950 dark:text-neutral-50">{profile.email}</p>
            <p className="mt-1 text-slate-500 dark:text-neutral-400">Email đăng nhập</p>
          </div>
        </div>
      </div>
      <div className="grid border-t border-slate-100 bg-slate-50/80 dark:border-neutral-900 dark:bg-black/40 sm:grid-cols-3">
        <ProfileStat label="Hạng khách hàng" value={profile.customerTier} />
        <ProfileStat label="VIP" value={profile.vipTier} />
        <ProfileStat label="Điện thoại" value={profile.phone || "Chưa cập nhật"} />
      </div>
    </div>
  );
}

export function SectionPanel({ children, description, icon, title }: SectionPanelProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-200">
          {icon}
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-950 dark:text-neutral-50">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-neutral-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function IconField({
  autoComplete,
  defaultValue,
  error,
  icon,
  label,
  max,
  name,
  type = "text",
}: IconFieldProps) {
  const errorId = `${name}-error`;

  return (
    <div className="relative space-y-2">
      <label className="text-sm font-semibold text-slate-800 dark:text-neutral-200" htmlFor={name}>
        {label}
      </label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        autoComplete={autoComplete}
        className={`h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 dark:bg-black dark:text-neutral-50 ${
          error
            ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-900"
            : "border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800"
        } ${icon ? "pl-11" : ""}`}
        defaultValue={defaultValue}
        id={name}
        max={max}
        name={name}
        type={type}
      />
      {icon ? (
        <span className="pointer-events-none absolute left-4 top-[42px] text-slate-400 dark:text-neutral-500">
          {icon}
        </span>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-rose-600 dark:text-rose-300" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-slate-100 px-5 py-4 dark:border-neutral-900 sm:border-l sm:border-t-0 first:sm:border-l-0">
      <p className="text-xs font-semibold uppercase text-slate-500 dark:text-neutral-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-slate-950 dark:text-neutral-50">{value}</p>
    </div>
  );
}
