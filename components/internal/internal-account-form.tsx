"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  FiArrowLeft,
  FiBriefcase,
  FiClock,
  FiKey,
  FiMail,
  FiPhone,
  FiSave,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { ZodError } from "zod";

import { PasswordField } from "@/components/ui/password-field";
import { useToast } from "@/components/ui/toast";
import { internalSessionQueryKey } from "@/hooks/use-internal-session";
import {
  type ApiError,
  updateInternalAccountProfile,
} from "@/lib/client/api-client";
import {
  internalAccountProfileRequestSchema,
  type InternalAccountProfile,
  type InternalAccountProfileRequest,
} from "@/lib/shared/internal";

import { InternalPanel, InternalPageHeader } from "./internal-primitives";

type InternalAccountErrors = Partial<Record<keyof InternalAccountProfileRequest, string>>;

type InternalAccountFormProps = {
  profile: InternalAccountProfile;
};

function getMessage(error: unknown) {
  return (error as ApiError | undefined)?.message ?? "Không thể cập nhật tài khoản lúc này.";
}

function getFieldErrors(error: ZodError<InternalAccountProfileRequest>) {
  const errors: InternalAccountErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (
      (field === "fullName" ||
        field === "phone" ||
        field === "currentPassword" ||
        field === "newPassword" ||
        field === "confirmNewPassword") &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

function getSafeInternalReturnPath(value: string | null) {
  if (!value || !value.startsWith("/internal")) {
    return null;
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin || url.pathname === "/internal/account") {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Không có";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function DetailCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-transform duration-300 hover:-translate-y-0.5 dark:border-neutral-800 dark:bg-black">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-700 dark:bg-black dark:text-sky-300">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
            {label}
          </p>
          <p className="truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function InternalAccountForm({ profile }: InternalAccountFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<InternalAccountErrors>({});
  const [isPending, setIsPending] = useState(false);
  const { dismissToast, showToast } = useToast();

  const navigateBack = () => {
    const returnPath = getSafeInternalReturnPath(searchParams.get("next"));

    if (returnPath) {
      router.replace(returnPath);
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/internal");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dismissToast();
    setErrors({});
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const parsedInput = internalAccountProfileRequestSchema.safeParse({
      confirmNewPassword: String(formData.get("confirmNewPassword") ?? ""),
      currentPassword: String(formData.get("currentPassword") ?? ""),
      fullName: String(formData.get("fullName") ?? ""),
      newPassword: String(formData.get("newPassword") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });

    if (!parsedInput.success) {
      setErrors(getFieldErrors(parsedInput.error));
      showToast({
        message: "Vui lòng kiểm tra lại thông tin trước khi lưu.",
        title: "Thông tin chưa hợp lệ",
        variant: "warning",
      });
      setIsPending(false);
      return;
    }

    try {
      const response = await updateInternalAccountProfile(parsedInput.data);

      queryClient.setQueryData(internalSessionQueryKey, (current: { user: InternalAccountProfile } | undefined) => {
        if (!current?.user) {
          return current;
        }

        return {
          user: {
            ...current.user,
            fullName: response.profile.fullName,
          },
        };
      });

      showToast({
        message: "Thông tin nhân sự đã được lưu.",
        title: "Cập nhật thành công",
        variant: "success",
      });
      router.refresh();
    } catch (submissionError) {
      const apiError = submissionError as ApiError | undefined;

      if (apiError?.status === 401) {
        router.replace("/internal/login?next=/internal/account");
      }

      if (apiError?.fields?.length) {
        const nextErrors: InternalAccountErrors = {};

        for (const field of apiError.fields) {
          if (
            field === "fullName" ||
            field === "phone" ||
            field === "currentPassword" ||
            field === "newPassword" ||
            field === "confirmNewPassword"
          ) {
            nextErrors[field] = apiError.message;
          }
        }

        setErrors(nextErrors);
      }

      showToast({
        message: getMessage(submissionError),
        title: "Cập nhật chưa thành công",
        variant: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="relative min-h-dvh overflow-hidden bg-white text-slate-950 dark:bg-black dark:text-neutral-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:py-8">
        <InternalPageHeader
          action={
            <button
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-200 hover:text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:border-sky-900 dark:hover:text-sky-300"
              onClick={navigateBack}
              type="button"
            >
              <FiArrowLeft size={17} />
              Quay lại
            </button>
          }
          description="Cập nhật tên hiển thị, số điện thoại và mật khẩu đăng nhập cho tài khoản nhân sự hành chính."
          title="Tài khoản nội bộ"
        />

        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <InternalPanel className="overflow-hidden border-slate-200 bg-white p-5 transition-transform duration-300 hover:-translate-y-1 dark:border-neutral-800 dark:bg-black">
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700 dark:text-sky-300">
                      Đang đăng nhập
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-neutral-50">
                      {profile.fullName}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">{profile.email}</p>
                  </div>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sky-700 dark:bg-black dark:text-sky-300">
                    <FiUser size={22} />
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <DetailCard icon={<FiBriefcase size={18} />} label="Phòng ban" value={profile.department} />
                  <DetailCard icon={<FiShield size={18} />} label="Cấp bậc" value={profile.staffLevel} />
                  <DetailCard icon={<FiPhone size={18} />} label="Số điện thoại" value={profile.phone || "Chưa có"} />
                  <DetailCard icon={<FiClock size={18} />} label="Ngày tuyển" value={formatDateTime(profile.hiredAt)} />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700 dark:bg-black dark:text-emerald-300">
                    <FiKey size={19} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-neutral-50">Quyền hiện tại</p>
                    <p className="text-sm text-slate-600 dark:text-neutral-400">Các quyền đi kèm với vai trò nội bộ.</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.permissions.map((permission) => (
                    <span
                      className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:-translate-y-0.5 dark:border-emerald-900 dark:bg-black dark:text-emerald-300"
                      key={permission}
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-black">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-violet-700 dark:bg-black dark:text-violet-300">
                    <FiMail size={19} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-neutral-50">Dữ liệu gắn với hồ sơ</p>
                    <p className="text-sm text-slate-600 dark:text-neutral-400">Email, vai trò và hạng tài khoản được đồng bộ từ hệ thống.</p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 dark:bg-black">
                    <dt className="text-slate-500 dark:text-neutral-400">Vai trò</dt>
                    <dd className="font-semibold text-slate-950 dark:text-neutral-50">{profile.role}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 dark:bg-black">
                    <dt className="text-slate-500 dark:text-neutral-400">Phòng ban</dt>
                    <dd className="font-semibold text-emerald-700 dark:text-emerald-300">{profile.department}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </InternalPanel>

          <InternalPanel className="overflow-hidden border-slate-200 bg-white p-5 transition-transform duration-300 hover:-translate-y-1 dark:border-neutral-800 dark:bg-black">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 dark:bg-black dark:text-sky-300">
                <FiSave size={19} />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-neutral-50">Chỉnh sửa hồ sơ</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                  Cập nhật tên hiển thị, số điện thoại, và đổi mật khẩu khi cần.
                </p>
              </div>
            </div>

            <form className="grid gap-4" noValidate onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-800 dark:text-neutral-200" htmlFor="fullName">
                    Họ tên
                  </label>
                  <input
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                    aria-invalid={errors.fullName ? true : undefined}
                    defaultValue={profile.fullName}
                    className={`h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 dark:bg-black dark:text-neutral-50 ${
                      errors.fullName
                        ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-900"
                        : "border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800"
                    }`}
                    id="fullName"
                    name="fullName"
                    placeholder="Nhập họ tên"
                    type="text"
                  />
                  {errors.fullName ? (
                    <p className="text-sm font-medium text-rose-600 dark:text-rose-300" id="fullName-error">
                      {errors.fullName}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <label className="text-sm font-semibold text-slate-800 dark:text-neutral-200" htmlFor="phone">
                    Số điện thoại
                  </label>
                  <input
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    aria-invalid={errors.phone ? true : undefined}
                    defaultValue={profile.phone}
                    className={`h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 dark:bg-black dark:text-neutral-50 ${
                      errors.phone
                        ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-900"
                        : "border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800"
                    }`}
                    id="phone"
                    name="phone"
                    placeholder="0900000000"
                    type="tel"
                  />
                  {errors.phone ? (
                    <p className="text-sm font-medium text-rose-600 dark:text-rose-300" id="phone-error">
                      {errors.phone}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-black">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-700 dark:bg-black dark:text-sky-300">
                    <FiKey size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-neutral-50">Đổi mật khẩu</p>
                    <p className="text-sm text-slate-600 dark:text-neutral-400">
                      Để trống nếu bạn chỉ muốn cập nhật thông tin cá nhân.
                    </p>
                  </div>
                </div>
              </div>

              <PasswordField
                autoComplete="current-password"
                error={errors.currentPassword}
                label="Mật khẩu hiện tại"
                name="currentPassword"
              />

              <PasswordField
                autoComplete="new-password"
                error={errors.newPassword}
                intent="emerald"
                label="Mật khẩu mới"
                minLength={12}
                name="newPassword"
              />

              <PasswordField
                autoComplete="new-password"
                error={errors.confirmNewPassword}
                intent="emerald"
                label="Xác nhận mật khẩu mới"
                minLength={12}
                name="confirmNewPassword"
              />

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-600 dark:text-neutral-400">
                  Mọi thay đổi sẽ được ghi lại ngay sau khi lưu.
                </p>
                <button
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                  disabled={isPending}
                  type="submit"
                >
                  <FiSave size={18} />
                  {isPending ? "Đang lưu" : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </InternalPanel>
        </div>
      </div>
    </section>
  );
}
