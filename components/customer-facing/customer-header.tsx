"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FiBell, FiMenu, FiSearch, FiSidebar, FiUser, FiX } from "react-icons/fi";

import { logoutCustomerAccount } from "@/lib/client/api-client";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import { authSessionQueryKey, useAuthSession } from "@/hooks/use-auth-session";

import { ThemeToggle } from "./theme-controller";
import type { SidebarPreference } from "./customer-portal-shell";

type CustomerHeaderProps = {
  leftSidebar: SidebarPreference;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  rightSidebar: SidebarPreference;
};

function SidebarToggleIcon({ preference }: { preference: SidebarPreference }) {
  if (preference === "open") {
    return <FiX size={20} />;
  }

  if (preference === "closed") {
    return <FiMenu size={20} />;
  }

  return (
    <>
      <FiMenu className="lg:hidden" size={20} />
      <FiX className="hidden lg:block" size={20} />
    </>
  );
}

function getSidebarLabel(preference: SidebarPreference, closedLabel: string, openLabel: string) {
  if (preference === "open") {
    return openLabel;
  }

  if (preference === "closed") {
    return closedLabel;
  }

  return "Chuyển đổi hiển thị";
}

export function CustomerHeader({
  leftSidebar,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  rightSidebar,
}: CustomerHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: authSession } = useAuthSession();
  const user = authSession?.user ?? null;
  const accountHref = `/login?next=${encodeURIComponent(pathname)}`;
  const logoutMutation = useMutation({
    mutationFn: logoutCustomerAccount,
    onSuccess: () => {
      queryClient.setQueryData(authSessionQueryKey, { user: null });
      showToast({
        message: "Phiên đăng nhập đã được kết thúc.",
        title: "Đã đăng xuất",
        variant: "success",
      });
      router.replace("/login");
      router.refresh();
    },
    onError: () => {
      showToast({
        message: "Không thể đăng xuất lúc này.",
        title: "Đăng xuất chưa thành công",
        variant: "error",
      });
    },
  });

  const handleAccountAction = (value: string) => {
    if (value === "account") {
      router.push(`/account?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (value === "logout" && !logoutMutation.isPending) {
      logoutMutation.mutate();
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white dark:border-neutral-900 dark:bg-black">
      <div className="mx-auto grid min-h-20 w-full max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
        <button
          aria-label={getSidebarLabel(leftSidebar, "Mở menu", "Đóng menu")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:border-sky-900 dark:hover:bg-neutral-950 dark:hover:text-sky-300"
          onClick={onToggleLeftSidebar}
          type="button"
        >
          <SidebarToggleIcon preference={leftSidebar} />
        </button>

        <div className="mx-auto w-full max-w-2xl">
          <label className="relative block">
            <span className="sr-only">Tìm kiếm chuyến đi</span>
            <FiSearch
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500"
              size={19}
            />
            <input
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black dark:text-neutral-50 dark:placeholder:text-neutral-500 dark:focus:border-sky-400"
              placeholder="Tìm điểm đến, tour hoặc mã đặt vé"
              type="search"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          <button
            aria-label="Thông báo"
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:border-rose-950 dark:hover:bg-neutral-950 dark:hover:text-rose-300"
            type="button"
          >
            <FiBell size={19} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-neutral-900" />
          </button>

          {user ? (
            <SelectField
              buttonClassName="h-11 rounded-xl px-2 sm:px-3 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:border-emerald-950 dark:hover:bg-neutral-950"
              className="w-14 sm:w-52"
              hidePlaceholderOption
              label="Tài khoản"
              labelClassName="sr-only"
              name="account-actions"
              onValueChange={handleAccountAction}
              options={[
                { label: "Cập nhật tài khoản", value: "account" },
                { label: logoutMutation.isPending ? "Đang đăng xuất" : "Đăng xuất", value: "logout" },
              ]}
              popoverClassName="right-0 w-56"
              placeholder="Tài khoản"
              renderValue={() => (
                <span className="flex items-center justify-center gap-2 text-slate-700 dark:text-neutral-200">
                  <FiUser size={19} />
                  <span className="hidden max-w-32 truncate sm:block">{user.fullName}</span>
                </span>
              )}
              value=""
            />
          ) : (
            <Link
              aria-label="Tài khoản"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:border-emerald-950 dark:hover:bg-neutral-950 dark:hover:text-emerald-300"
              href={accountHref}
            >
              <FiUser size={19} />
            </Link>
          )}

          <button
            aria-label={getSidebarLabel(
              rightSidebar,
              "Mở bảng gợi ý",
              "Đóng bảng gợi ý",
            )}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:border-violet-950 dark:hover:bg-neutral-950 dark:hover:text-violet-300"
            onClick={onToggleRightSidebar}
            type="button"
          >
            <FiSidebar size={19} />
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-3 dark:border-neutral-900 sm:hidden">
        <ThemeToggle />
      </div>
    </header>
  );
}
