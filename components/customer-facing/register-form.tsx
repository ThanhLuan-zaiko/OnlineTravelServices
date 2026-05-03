"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FiUserPlus } from "react-icons/fi";
import { ZodError } from "zod";

import { registerCustomerAccount, type ApiError } from "@/lib/client/api-client";
import { registerRequestSchema, type RegisterRequest } from "@/lib/shared/auth";
import { PasswordField } from "@/components/ui/password-field";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import { authSessionQueryKey } from "@/hooks/use-auth-session";

const genderOptions = [
  { label: "Nữ", value: "female" },
  { label: "Nam", value: "male" },
  { label: "Khác", value: "other" },
];

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

function getTodayDateString() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function getMessage(error: unknown) {
  return (error as ApiError | undefined)?.message ?? "Không thể đăng ký lúc này.";
}

function getDuplicateErrors(error: ApiError | undefined) {
  if (error?.status !== 409 || error.message !== "tài khoản đã tồn tại") {
    return null;
  }

  const duplicateFields = new Set(error.fields);
  const nextErrors: RegisterErrors = {};

  if (duplicateFields.has("email")) {
    nextErrors.email = "Email đã được sử dụng.";
  }

  if (duplicateFields.has("phone")) {
    nextErrors.phone = "Số điện thoại đã được sử dụng.";
  }

  if (!nextErrors.email && !nextErrors.phone) {
    nextErrors.email = "Email hoặc số điện thoại đã tồn tại.";
    nextErrors.phone = "Email hoặc số điện thoại đã tồn tại.";
  }

  return nextErrors;
}

type RegisterErrors = Partial<Record<keyof RegisterRequest, string>>;

function getFieldErrors(error: ZodError<RegisterRequest>) {
  const errors: RegisterErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !errors[field as keyof RegisterRequest]) {
      errors[field as keyof RegisterRequest] = issue.message;
    }
  }

  return errors;
}

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const { dismissToast, showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dismissToast();
    setErrors({});
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const parsedInput = registerRequestSchema.safeParse({
      fullName: getString(formData, "fullName"),
      email: getString(formData, "email"),
      phone: getString(formData, "phone"),
      password: getString(formData, "password"),
      confirmPassword: getString(formData, "confirmPassword"),
      gender: getString(formData, "gender"),
      birthDate: getString(formData, "birthDate"),
      address: getString(formData, "address"),
      nationality: getString(formData, "nationality"),
      passportNumber: getString(formData, "passportNumber"),
      emergencyContactName: getString(formData, "emergencyContactName"),
      emergencyContactPhone: getString(formData, "emergencyContactPhone"),
    });

    if (!parsedInput.success) {
      setErrors(getFieldErrors(parsedInput.error));
      showToast({
        message: "Một vài thông tin cần được bổ sung hoặc chỉnh lại.",
        title: "Thông tin chưa hợp lệ",
        variant: "warning",
      });
      setIsPending(false);
      return;
    }

    try {
      const authResponse = await registerCustomerAccount(parsedInput.data);
      queryClient.setQueryData(authSessionQueryKey, { user: authResponse.user });
      showToast({
        message: "Hồ sơ của bạn đã được tạo. Đang đưa bạn về trang chủ.",
        title: "Tạo tài khoản thành công",
        variant: "success",
      });
      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 650);
    } catch (submissionError) {
      const duplicateErrors = getDuplicateErrors(submissionError as ApiError | undefined);

      if (duplicateErrors) {
        setErrors(duplicateErrors);
      }

      showToast({
        message: getMessage(submissionError),
        title: "Đăng ký chưa thành công",
        variant: "error",
      });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field autoComplete="name" error={errors.fullName} label="Họ tên" name="fullName" />
        <Field autoComplete="tel" error={errors.phone} label="Số điện thoại" name="phone" type="tel" />
        <Field autoComplete="email" error={errors.email} label="Email" name="email" type="email" />
        <SelectField
          error={errors.gender}
          label="Giới tính"
          name="gender"
          options={genderOptions}
          placeholder="Không chọn"
        />
        <Field
          error={errors.birthDate}
          label="Ngày sinh"
          max={getTodayDateString()}
          name="birthDate"
          type="date"
        />
        <Field autoComplete="country-name" error={errors.nationality} label="Quốc tịch" name="nationality" />
        <Field error={errors.passportNumber} label="Số hộ chiếu" name="passportNumber" />
        <Field autoComplete="street-address" error={errors.address} label="Địa chỉ" name="address" />
        <Field error={errors.emergencyContactName} label="Liên hệ khẩn cấp" name="emergencyContactName" />
        <Field error={errors.emergencyContactPhone} label="SĐT khẩn cấp" name="emergencyContactPhone" type="tel" />
        <PasswordField
          autoComplete="new-password"
          error={errors.password}
          intent="emerald"
          label="Mật khẩu"
          minLength={12}
          name="password"
        />
        <PasswordField
          autoComplete="new-password"
          error={errors.confirmPassword}
          intent="emerald"
          label="Xác nhận mật khẩu"
          minLength={12}
          name="confirmPassword"
        />
      </div>

      <button
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-neutral-700"
        disabled={isPending}
        type="submit"
      >
        <FiUserPlus size={18} />
        {isPending ? "Đang tạo tài khoản" : "Tạo tài khoản khách hàng"}
      </button>
    </form>
  );
}

type FieldProps = {
  autoComplete?: string;
  error?: string;
  label: string;
  max?: string;
  minLength?: number;
  name: string;
  type?: string;
};

function Field({
  autoComplete,
  error,
  label,
  max,
  minLength,
  name,
  type = "text",
}: FieldProps) {
  const errorId = `${name}-error`;

  return (
    <div className="space-y-2">
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
            : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-neutral-800"
        }`}
        id={name}
        max={max}
        minLength={minLength}
        name={name}
        type={type}
      />
      {error ? (
        <p className="text-sm font-medium text-rose-600 dark:text-rose-300" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
