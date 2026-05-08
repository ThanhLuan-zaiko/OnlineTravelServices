import { FiArchive, FiGrid, FiImage, FiUsers } from "react-icons/fi";

import type { InternalServiceProvider, InternalServiceProviderMedia, ServiceProviderMutationRequest } from "@/lib/shared/internal";

export type ProviderTab = "archived" | "list" | "manage" | "media";
export type DangerAction =
  | { kind: "archive"; provider: InternalServiceProvider }
  | { kind: "delete-media"; media: InternalServiceProviderMedia }
  | { kind: "hard-delete"; provider: InternalServiceProvider }
  | { kind: "restore"; provider: InternalServiceProvider }
  | null;

export type SelectedFilePreview = {
  file: File;
  previewUrl: string;
};

export const defaultServiceType = "transport";

export const initialForm: ServiceProviderMutationRequest = {
  contractStatus: "draft",
  email: "",
  phone: "",
  providerName: "",
  rating: 0,
  region: "",
  serviceType: defaultServiceType,
  status: "active",
};

export const serviceTypeOptions = [
  { label: "transport", value: "transport" },
  { label: "hotel", value: "hotel" },
  { label: "restaurant", value: "restaurant" },
  { label: "guide", value: "guide" },
  { label: "ticket", value: "ticket" },
];

export const activeStatusOptions = [
  { label: "active", value: "active" },
  { label: "inactive", value: "inactive" },
  { label: "suspended", value: "suspended" },
];

export const contractStatusOptions = [
  { label: "draft", value: "draft" },
  { label: "active", value: "active" },
  { label: "expired", value: "expired" },
];

export const pageSizeOptions = [
  { label: "6 items", value: "6" },
  { label: "8 items", value: "8" },
  { label: "12 items", value: "12" },
  { label: "24 items", value: "24" },
];

export const tabs = [
  { href: "/internal/providers/manage", icon: FiUsers, label: "Tạo + Sửa" },
  { href: "/internal/providers/list", icon: FiGrid, label: "Danh sách" },
  { href: "/internal/providers/archived", icon: FiArchive, label: "Archived" },
  { href: "/internal/providers/media", icon: FiImage, label: "Kho ảnh" },
] as const;

export function buildForm(provider: InternalServiceProvider): ServiceProviderMutationRequest {
  return {
    contractStatus: provider.contractStatus,
    email: provider.email,
    phone: provider.phone,
    providerName: provider.providerName,
    rating: provider.rating,
    region: provider.region,
    serviceType: provider.serviceType,
    status: provider.status === "archived" ? provider.archivedFromStatus ?? "inactive" : provider.status,
  };
}

export function getActiveTab(pathname: string): ProviderTab {
  if (pathname.startsWith("/internal/providers/list")) {
    return "list";
  }

  if (pathname.startsWith("/internal/providers/archived")) {
    return "archived";
  }

  if (pathname.startsWith("/internal/providers/media")) {
    return "media";
  }

  return "manage";
}

export function getPageCopy(activeTab: ProviderTab) {
  if (activeTab === "list") {
    return {
      description: "Duyệt, tìm kiếm, sửa nhanh, soft delete và hard delete nhà cung cấp theo từng trang.",
      title: "Danh sách nhà cung cấp",
    };
  }

  if (activeTab === "archived") {
    return {
      description: "Khôi phục nhà cung cấp đã xóa mềm hoặc xóa vĩnh viễn kèm toàn bộ ảnh.",
      title: "Nhà cung cấp đã lưu trữ",
    };
  }

  if (activeTab === "media") {
    return {
      description: "Quản lý gallery ảnh, set cover và dọn ảnh riêng cho từng nhà cung cấp.",
      title: "Kho ảnh nhà cung cấp",
    };
  }

  return {
    description: "Tạo hoặc cập nhật hồ sơ nhà cung cấp, hợp đồng, trạng thái vận hành và ảnh minh chứng.",
    title: "Tạo và chỉnh sửa nhà cung cấp",
  };
}

function slugifyProviderName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "provider";
}

export function buildEditHref(provider: InternalServiceProvider) {
  return `/internal/providers/manage/edit/${provider.serviceType}/${slugifyProviderName(provider.providerName)}-${provider.providerId}`;
}

export function extractEditProvider(pathname: string) {
  const match = pathname.match(
    /\/internal\/providers\/manage\/edit\/([^/]+)\/.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );

  return match ? { providerId: match[2], serviceType: decodeURIComponent(match[1]) } : null;
}

export function toValidationErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.reduce<Partial<Record<keyof ServiceProviderMutationRequest, string>>>((accumulator, issue) => {
    const key = issue.path[0];

    if (typeof key === "string") {
      accumulator[key as keyof ServiceProviderMutationRequest] = issue.message;
    }

    return accumulator;
  }, {});
}

export function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function imageFolderLabel(url: string | null) {
  return url ? url.split("/").slice(0, 5).join("/") : "";
}