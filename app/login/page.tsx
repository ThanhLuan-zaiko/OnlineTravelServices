import type { Metadata } from "next";

import { AuthPageShell } from "@/components/customer-facing/auth-page-shell";
import { LoginForm } from "@/components/customer-facing/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập | Online Travel Services",
};

export default function LoginPage() {
  return (
    <AuthPageShell
      alternateAction={{
        href: "/register",
        label: "Tạo tài khoản",
        text: "Chưa có tài khoản?",
      }}
      description="Chào mừng bạn quay lại. Tiếp tục khám phá những hành trình phù hợp, theo dõi đặt chỗ và lưu lại các lựa chọn yêu thích cho chuyến đi sắp tới."
      eyebrow="Chào mừng trở lại"
      highlights={["Theo dõi lịch trình dễ dàng", "Lưu điểm đến yêu thích", "Quản lý đặt chỗ nhanh", "Nhận gợi ý tour phù hợp"]}
      title="Đăng nhập tài khoản"
    >
      <LoginForm />
    </AuthPageShell>
  );
}
