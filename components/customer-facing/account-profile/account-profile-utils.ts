import { ZodError } from "zod";

import type { ApiError } from "@/lib/client/api-client";
import type { AccountProfileRequest } from "@/lib/shared/auth";

import type { AccountProfileErrors } from "./account-profile-types";

export function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export function getTodayDateString() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

export function getFieldErrors(error: ZodError<AccountProfileRequest>) {
  const errors: AccountProfileErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !errors[field as keyof AccountProfileRequest]) {
      errors[field as keyof AccountProfileRequest] = issue.message;
    }
  }

  return errors;
}

export function getMessage(error: unknown) {
  return (error as ApiError | undefined)?.message ?? "Không thể cập nhật tài khoản lúc này.";
}

function getDuplicateErrors(error: ApiError | undefined) {
  if (error?.status !== 409 || error.message !== "tài khoản đã tồn tại") {
    return null;
  }

  const duplicateFields = new Set(error.fields);
  const nextErrors: AccountProfileErrors = {};

  if (duplicateFields.has("phone")) {
    nextErrors.phone = "Số điện thoại đã được sử dụng.";
  }

  return nextErrors;
}

export function getApiFieldErrors(error: ApiError | undefined) {
  const nextErrors = getDuplicateErrors(error) ?? {};
  const fields = new Set(error?.fields);

  if (fields.has("currentPassword")) {
    nextErrors.currentPassword = error?.message ?? "Mật khẩu hiện tại không đúng.";
  }

  if (fields.has("newPassword")) {
    nextErrors.newPassword = error?.message ?? "Mật khẩu mới chưa hợp lệ.";
  }

  if (fields.has("confirmNewPassword")) {
    nextErrors.confirmNewPassword = error?.message ?? "Xác nhận mật khẩu mới chưa hợp lệ.";
  }

  return Object.keys(nextErrors).length > 0 ? nextErrors : null;
}
