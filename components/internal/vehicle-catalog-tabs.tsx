"use client";

import Link from "next/link";
import { FiBarChart2, FiGrid, FiImage, FiTruck } from "react-icons/fi";

import { InternalPanel } from "./internal-primitives";
import type { VehicleCatalogTab } from "./use-vehicle-catalog-manager";
import type { VehicleCatalogManagerState } from "./vehicle-catalog-types";

export const vehicleTabs = [
  {
    href: "/internal/vehicle-catalog/manage",
    icon: FiTruck,
    label: "Tạo + Sửa",
  },
  {
    href: "/internal/vehicle-catalog/list",
    icon: FiGrid,
    label: "Danh sách",
  },
  {
    href: "/internal/vehicle-catalog/media",
    icon: FiImage,
    label: "Kho ảnh",
  },
] as const;

export function getActiveVehicleTab(pathname: string): VehicleCatalogTab {
  if (pathname.startsWith("/internal/vehicle-catalog/list")) {
    return "list";
  }

  if (pathname.startsWith("/internal/vehicle-catalog/media")) {
    return "media";
  }

  return "manage";
}

export function getVehiclePageCopy(activeTab: VehicleCatalogTab) {
  if (activeTab === "list") {
    return {
      description: "Duyệt, lọc và rà soát nhanh toàn bộ phương tiện đang dùng trong form tạo tour.",
      title: "Danh sách phương tiện",
    };
  }

  if (activeTab === "media") {
    return {
      description: "Kho lưu trữ phương tiện đã xóa mềm, cho phép khôi phục hoặc xóa vĩnh viễn kèm ảnh vật lý.",
      title: "Kho lưu trữ phương tiện",
    };
  }

  return {
    description: "Tạo hoặc cập nhật cấu hình phương tiện, chuẩn hóa loại xe, dòng xe, sức chứa và ảnh minh chứng trong cùng một lượt.",
    title: "Tạo và chỉnh sửa phương tiện",
  };
}

export function VehicleWorkspaceTabs({ pathname }: { pathname: string }) {
  return (
    <InternalPanel className="p-3">
      <div className="flex flex-wrap gap-2">
        {vehicleTabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                active
                  ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-800 dark:bg-black dark:text-neutral-300 dark:hover:bg-neutral-900"
              }`}
              href={tab.href}
              key={tab.href}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </InternalPanel>
  );
}

export function VehicleCatalogStats({ stats }: { stats: VehicleCatalogManagerState["stats"] }) {
  const items = [
    { label: "Tổng danh mục", value: stats.total },
    { label: "Đang dùng", value: stats.active },
    { label: "Tạm ngưng", value: stats.inactive },
    { label: "Đã có ảnh", value: stats.withImage },
    { label: "Lưu trữ", value: stats.archived },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-5">
      {items.map((item) => (
        <InternalPanel className="p-4" key={item.label}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            <FiBarChart2 size={14} />
            {item.label}
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-neutral-50">{item.value}</p>
        </InternalPanel>
      ))}
    </div>
  );
}
