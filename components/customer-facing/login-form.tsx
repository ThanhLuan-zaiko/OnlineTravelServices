"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FiLogIn } from "react-icons/fi";
import { ZodError } from "zod";

import { loginCustomerAccount, type ApiError } from "@/lib/client/api-client";
import { loginRequestSchema, type LoginRequest } from "@/lib/shared/auth";
import { PasswordField } from "@/components/ui/password-field";
import { useToast } from "@/components/ui/toast";
import { authSessionQueryKey } from "@/hooks/use-auth-session";

type LoginErrors = Partial<Record<keyof LoginRequest, string>>;

function getMessage(error: unknown) {
  return (error as ApiError | undefined)?.message ?? "Không thể đăng nhập lúc này.";
}

function getFieldErrors(error: ZodError<LoginRequest>) {
  const errors: LoginErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if ((field === "email" || field === "password") && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const { dismissToast, showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dismissToast();
    setErrors({});
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const parsedInput = loginRequestSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });

    if (!parsedInput.success) {
      setErrors(getFieldErrors(parsedInput.error));
      showToast({
        message: "Vui lòng kiểm tra lại email và mật khẩu trước khi tiếp tục.",
        title: "Thông tin chưa hợp lệ",
        variant: "warning",
      });
      setIsPending(false);
      return;
    }

    try {
      const authResponse = await loginCustomerAccount(parsedInput.data);
      queryClient.setQueryData(authSessionQueryKey, { user: authResponse.user });
      showToast({
        message: "Bạn sẽ được đưa về trang chủ trong giây lát.",
        title: "Đăng nhập thành công",
        variant: "success",
      });
      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 650);
    } catch (submissionError) {
      showToast({
        message: getMessage(submissionError),
        title: "Đăng nhập chưa thành công",
        variant: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-800 dark:text-neutral-200" htmlFor="email">
          Email
        </label>
        <input
          aria-describedby={errors.email ? "email-error" : undefined}
          aria-invalid={errors.email ? true : undefined}
          autoComplete="email"
          className={`h-12 w-full rounded-xl border bg-white px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 dark:bg-black dark:text-neutral-50 ${
            errors.email
              ? "border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-900"
              : "border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800"
          }`}
          id="email"
          name="email"
          placeholder="ban@example.com"
          type="email"
        />
        {errors.email ? (
          <p className="text-sm font-medium text-rose-600 dark:text-rose-300" id="email-error">
            {errors.email}
          </p>
        ) : null}
      </div>

      <PasswordField
        autoComplete="current-password"
        error={errors.password}
        label="Mật khẩu"
        name="password"
      />

      <button
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-neutral-700"
        disabled={isPending}
        type="submit"
      >
        <FiLogIn size={18} />
        {isPending ? "Đang đăng nhập" : "Đăng nhập"}
      </button>
    </form>
  );
}
