import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AuthPageShell } from "@/components/customer-facing/auth-page-shell";
import { InternalLoginForm } from "@/components/internal/internal-login-form";
import { buildAuthAlternateHref, getSafeAuthNextPath } from "@/lib/server/auth-navigation";
import { AUTH_COOKIE_NAME, getCurrentAdministrativeStaff } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: "Đăng nhập cổng nội bộ | Online Travel Services",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export default async function InternalLoginPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const currentUser = await getCurrentAdministrativeStaff(cookieStore.get(AUTH_COOKIE_NAME)?.value);

  if (currentUser) {
    redirect("/internal");
  }

  const resolvedSearchParams = await Promise.resolve(searchParams);
  const nextValue = Array.isArray(resolvedSearchParams?.next)
    ? resolvedSearchParams.next[0]
    : resolvedSearchParams?.next;
  const nextPath = getSafeAuthNextPath(nextValue);

  return (
    <AuthPageShell
      alternateAction={{
        href: buildAuthAlternateHref("/login", undefined),
        label: "Đăng nhập khách hàng",
        text: "Bạn là khách hàng?",
      }}
      description="Cổng này chỉ dành cho Administrative Staff để quản lý tour, lịch khởi hành, lịch trình và khuyến mãi."
      eyebrow="Cổng nội bộ"
      highlights={["Chỉ dùng cho staff nội bộ", "Truy cập quản lý tour", "Lịch trình và khuyến mãi", "Báo cáo doanh thu"]}
      title="Đăng nhập cổng nội bộ"
    >
      <InternalLoginForm nextPath={nextPath} />
    </AuthPageShell>
  );
}
