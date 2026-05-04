import type { Metadata } from "next";

import { AuthPageShell } from "@/components/customer-facing/auth-page-shell";
import { RegisterForm } from "@/components/customer-facing/register-form";
import { buildAuthAlternateHref } from "@/lib/server/auth-navigation";

export const metadata: Metadata = {
  title: "Đăng ký | Online Travel Services",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);

  return (
    <AuthPageShell
      alternateAction={{
        href: buildAuthAlternateHref("/login", resolvedSearchParams?.next),
        label: "Đăng nhập",
        text: "Đã có tài khoản?",
      }}
      description="Tạo hồ sơ du lịch của bạn để lên kế hoạch thuận tiện hơn, nhận gợi ý phù hợp và giữ thông tin chuyến đi ở một nơi dễ tìm."
      eyebrow="Bắt đầu hành trình"
      highlights={["Lưu hồ sơ đặt tour", "Tích điểm cho chuyến đi", "Nhận ưu đãi theo hạng", "Cập nhật lịch trình rõ ràng"]}
      title="Tạo tài khoản"
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
