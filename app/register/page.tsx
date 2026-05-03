import type { Metadata } from "next";

import { AuthPageShell } from "@/components/customer-facing/auth-page-shell";
import { RegisterForm } from "@/components/customer-facing/register-form";

export const metadata: Metadata = {
  title: "Đăng ký | Online Travel Services",
};

export default function RegisterPage() {
  return (
    <AuthPageShell
      alternateAction={{
        href: "/login",
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
