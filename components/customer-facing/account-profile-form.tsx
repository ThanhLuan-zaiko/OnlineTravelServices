"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FiSave } from "react-icons/fi";

import { updateAccountProfile, type ApiError } from "@/lib/client/api-client";
import {
  accountProfileRequestSchema,
  type AccountProfile,
} from "@/lib/shared/auth";
import { useToast } from "@/components/ui/toast";
import { authSessionQueryKey, type AuthSession } from "@/hooks/use-auth-session";

import { AccountProfileHeader } from "./account-profile/account-profile-layout";
import {
  PersonalInfoSection,
  SecuritySection,
  TravelDocumentSection,
} from "./account-profile/account-profile-sections";
import type { AccountProfileErrors } from "./account-profile/account-profile-types";
import {
  getApiFieldErrors,
  getFieldErrors,
  getMessage,
  getString,
} from "./account-profile/account-profile-utils";

type AccountProfileFormProps = {
  profile: AccountProfile;
};

export function AccountProfileForm({ profile }: AccountProfileFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [gender, setGender] = useState(profile.gender ?? "");
  const [errors, setErrors] = useState<AccountProfileErrors>({});
  const [isPending, setIsPending] = useState(false);
  const { dismissToast, showToast } = useToast();

  const getReturnPath = () => {
    const nextPath = searchParams.get("next");

    if (!nextPath?.startsWith("/")) {
      return null;
    }

    try {
      const url = new URL(nextPath, window.location.origin);

      if (url.origin !== window.location.origin || url.pathname === "/account") {
        return null;
      }

      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  };

  const navigateBack = () => {
    const returnPath = getReturnPath();

    if (returnPath) {
      router.replace(returnPath);
      return;
    }

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    dismissToast();
    setErrors({});
    setIsPending(true);

    const formData = new FormData(event.currentTarget);
    const parsedInput = accountProfileRequestSchema.safeParse({
      fullName: getString(formData, "fullName"),
      phone: getString(formData, "phone"),
      gender,
      birthDate: getString(formData, "birthDate"),
      address: getString(formData, "address"),
      nationality: getString(formData, "nationality"),
      passportNumber: getString(formData, "passportNumber"),
      emergencyContactName: getString(formData, "emergencyContactName"),
      emergencyContactPhone: getString(formData, "emergencyContactPhone"),
      currentPassword: getString(formData, "currentPassword"),
      newPassword: getString(formData, "newPassword"),
      confirmNewPassword: getString(formData, "confirmNewPassword"),
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
      const response = await updateAccountProfile(parsedInput.data);

      queryClient.setQueryData(authSessionQueryKey, (current: AuthSession | undefined) => {
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
        message: "Thông tin tài khoản đã được lưu.",
        title: "Cập nhật thành công",
        variant: "success",
      });
      navigateBack();
    } catch (submissionError) {
      const apiError = submissionError as ApiError | undefined;
      const apiFieldErrors = getApiFieldErrors(apiError);

      if (apiError?.status === 401) {
        router.replace("/login?next=/account");
      }

      if (apiFieldErrors) {
        setErrors(apiFieldErrors);
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
    <section className="min-h-dvh bg-slate-50 text-slate-950 dark:bg-black dark:text-neutral-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:py-10">
        <AccountProfileHeader onBack={navigateBack} profile={profile} />

        <form className="grid gap-5" noValidate onSubmit={handleSubmit}>
          <PersonalInfoSection
            errors={errors}
            gender={gender}
            onGenderChange={setGender}
            profile={profile}
          />
          <TravelDocumentSection errors={errors} profile={profile} />
          <SecuritySection errors={errors} />

          <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur dark:border-neutral-900 dark:bg-black/90 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
            <div className="flex justify-end">
              <button
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-neutral-700 sm:w-auto"
                disabled={isPending}
                type="submit"
              >
                <FiSave size={18} />
                {isPending ? "Đang lưu" : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
