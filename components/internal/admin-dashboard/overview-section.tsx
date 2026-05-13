import Link from "next/link";

import { InternalPanel, InternalPageHeader } from "../internal-primitives";
import { adminModules, type AdminModule } from "./config";

export function AdminHeader({ module }: { module: AdminModule }) {
  const copy: Record<AdminModule, { description: string; title: string }> = {
    audit: {
      description: "Tra cứu nhật ký thao tác nội bộ theo actor hoặc entity.",
      title: "Audit Admin",
    },
    customers: {
      description: "Quản lý khách hàng, VIP, reward, phản hồi và bảo mật trong namespace Admin tổng.",
      title: "Admin khách hàng",
    },
    operations: {
      description: "Admin tổng sử dụng toàn bộ nghiệp vụ vận hành và thống kê.",
      title: "Admin vận hành",
    },
    overview: {
      description: "Điều hướng các chức năng cấp Admin tổng theo sơ đồ quản trị.",
      title: "Admin tổng",
    },
    revenue: {
      description: "Theo dõi doanh thu, hiệu suất và các góc nhìn phân tích tài chính.",
      title: "Admin doanh thu",
    },
    staff: {
      description: "Tạo tài khoản staff, phân quyền, cập nhật trạng thái và theo dõi hoạt động.",
      title: "Quản lý nhân viên",
    },
    system: {
      description: "Quản lý task hệ thống, backup/restore dữ liệu và chạy bảo trì ScyllaDB.",
      title: "Quản lý hệ thống tổng hợp",
    },
  };

  return <InternalPageHeader description={copy[module].description} title={copy[module].title} />;
}

export function AdminModuleNavigation({ activeModule }: { activeModule: AdminModule }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {adminModules.map((item) => {
        const Icon = item.icon;
        const active = item.key === activeModule;

        return (
          <Link
            className={`rounded-xl border p-4 transition hover:border-sky-300 hover:text-sky-800 dark:hover:border-sky-900 dark:hover:text-sky-200 ${
              active
                ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100"
                : "border-slate-200 bg-white text-slate-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-300"
            }`}
            href={item.href}
            key={item.key}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/20">
              <Icon size={17} />
            </span>
            <p className="mt-3 text-sm font-semibold">{item.label}</p>
            <p className="mt-1 line-clamp-2 text-xs text-current/70">{item.description}</p>
          </Link>
        );
      })}
    </div>
  );
}

export function AdminOverview() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <InternalPanel className="p-4">
        <h2 className="text-base font-semibold">Luồng Admin tổng</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {adminModules.slice(1).map((item) => {
            const Icon = item.icon;

            return (
              <Link
                className="rounded-xl border border-slate-200 p-3 transition hover:border-sky-300 hover:text-sky-700 dark:border-neutral-800 dark:hover:border-sky-900"
                href={item.href}
                key={item.key}
              >
                <div className="flex items-center gap-2">
                  <Icon size={16} />
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-neutral-400">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </InternalPanel>

      <InternalPanel className="p-4">
        <h2 className="text-base font-semibold">Quyền tích hợp</h2>
        <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-neutral-400">
          <p>Admin tổng tạo được cả tài khoản nhân viên dưới trướng.</p>
          <p>Module vận hành đã mở cho Admin tổng nhưng vẫn giữ quyền truy cập riêng cho nhân viên.</p>
          <p>Backup/restore và maintenance thực thi qua Docker container ScyllaDB cục bộ.</p>
        </div>
      </InternalPanel>
    </div>
  );
}
