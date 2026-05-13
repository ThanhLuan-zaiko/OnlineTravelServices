import {
  FiActivity,
  FiArchive,
  FiBarChart2,
  FiClipboard,
  FiDatabase,
  FiHardDrive,
  FiHome,
  FiRefreshCw,
  FiSave,
  FiShield,
  FiUsers,
} from "react-icons/fi";

import type {
  AdminStaffCreateRequest,
  AdminStaffRole,
  AdminStaffStatus,
  AdminSystemTaskMutationRequest,
} from "@/lib/shared/internal";

export type AdminModule = "audit" | "customers" | "operations" | "overview" | "revenue" | "staff" | "system";
export type StaffTab = "activity" | "create" | "disabled" | "list" | "permissions" | "roles";
export type SystemTab = "backups" | "health" | "jobs" | "maintenance" | "restore" | "tasks";

export const adminModules: Array<{
  description: string;
  href: string;
  icon: typeof FiHome;
  key: AdminModule;
  label: string;
}> = [
  {
    description: "Tổng hợp quyền Admin và các khu vực quản trị cấp cao.",
    href: "/internal/admin",
    icon: FiHome,
    key: "overview",
    label: "Tổng quan",
  },
  {
    description: "Tạo, phân quyền, cập nhật và xóa tài khoản nhân sự nội bộ.",
    href: "/internal/admin/staff/list",
    icon: FiUsers,
    key: "staff",
    label: "Nhân viên",
  },
  {
    description: "Quản lý khách hàng, VIP, vi phạm, reward và phản hồi.",
    href: "/internal/admin/customers/list",
    icon: FiShield,
    key: "customers",
    label: "Khách hàng",
  },
  {
    description: "Doanh thu, hiệu suất tour và các góc nhìn so sánh.",
    href: "/internal/admin/revenue/dashboard",
    icon: FiBarChart2,
    key: "revenue",
    label: "Doanh thu",
  },
  {
    description: "Truy cập toàn bộ chức năng vận hành và thống kê của operations staff.",
    href: "/internal/admin/operations",
    icon: FiActivity,
    key: "operations",
    label: "Vận hành",
  },
  {
    description: "Task hệ thống, backup, restore và bảo trì ScyllaDB.",
    href: "/internal/admin/system/tasks",
    icon: FiDatabase,
    key: "system",
    label: "Hệ thống",
  },
  {
    description: "Theo dõi audit thao tác nội bộ và truy vết entity.",
    href: "/internal/admin/audit",
    icon: FiClipboard,
    key: "audit",
    label: "Audit",
  },
];

export const staffTabs = [
  { href: "/internal/admin/staff/list", icon: FiUsers, label: "Danh sách" },
  { href: "/internal/admin/staff/create", icon: FiSave, label: "Tạo nhân viên" },
  { href: "/internal/admin/staff/roles", icon: FiShield, label: "Vai trò" },
  { href: "/internal/admin/staff/permissions", icon: FiShield, label: "Ma trận quyền" },
  { href: "/internal/admin/staff/activity", icon: FiActivity, label: "Hiệu suất" },
  { href: "/internal/admin/staff/disabled", icon: FiArchive, label: "Đã khóa" },
];

export const systemTabs = [
  { href: "/internal/admin/system/tasks", icon: FiClipboard, label: "Task" },
  { href: "/internal/admin/system/jobs", icon: FiActivity, label: "Job chạy" },
  { href: "/internal/admin/system/backups", icon: FiArchive, label: "Backup" },
  { href: "/internal/admin/system/restore", icon: FiRefreshCw, label: "Restore" },
  { href: "/internal/admin/system/maintenance", icon: FiHardDrive, label: "Bảo trì" },
  { href: "/internal/admin/system/health", icon: FiDatabase, label: "Sức khỏe" },
];

export const revenueTabs = [
  { href: "/internal/admin/revenue/dashboard", icon: FiBarChart2, label: "Dashboard" },
  { href: "/internal/admin/revenue/forecast", icon: FiActivity, label: "Dự báo" },
  { href: "/internal/admin/revenue/profitability", icon: FiShield, label: "Lợi nhuận" },
  { href: "/internal/admin/revenue/compare", icon: FiClipboard, label: "So sánh" },
  { href: "/internal/admin/revenue/taxes", icon: FiClipboard, label: "Thuế" },
  { href: "/internal/admin/revenue/losses", icon: FiArchive, label: "Lỗ/hoàn tiền" },
];

export const roleOptions: Array<{ label: string; value: AdminStaffRole }> = [
  { label: "Administrative staff", value: "administrative_staff" },
  { label: "Operations statistics staff", value: "operations_statistics_staff" },
];

export const statusOptions: Array<{ label: string; value: AdminStaffStatus | "all" }> = [
  { label: "Tất cả", value: "all" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Suspended", value: "suspended" },
];

export const adminPermissions = [
  "audit:read",
  "customer:manage",
  "notification:read",
  "suggested_tour:manage",
  "tour_approval:manage",
  "tour:manage",
  "schedule:manage",
  "promotion:manage",
  "revenue:read",
];

export const operationsPermissions = [
  "operations:access",
  "tour:read",
  "tour:update_status",
  "tour_info:update",
  "schedule:manage",
  "customer_stats:read",
  "customer_trend:analyze",
  "destination_stats:read",
  "revenue:read",
  "report:manage",
  "notification:manage",
  "notification:read",
  "audit:read",
];

export const superAdminOnlyPermissions = [
  "staff:manage",
  "system:manage",
];

export const superAdminPermissions = Array.from(
  new Set([...adminPermissions, ...operationsPermissions, ...superAdminOnlyPermissions]),
).sort();

export const permissionOptions = Array.from(new Set([...adminPermissions, ...operationsPermissions])).sort();

export const defaultCreateForm: AdminStaffCreateRequest = {
  department: "Administration",
  email: "",
  fullName: "",
  password: "",
  permissions: adminPermissions,
  phone: "",
  role: "administrative_staff",
  staffLevel: "standard",
};

export const defaultTaskForm: AdminSystemTaskMutationRequest = {
  assignedTo: null,
  dueAt: null,
  priority: "medium",
  taskType: "system_update",
  title: "",
};

export const operationModules = ["notifications", "overview", "reports", "schedules", "statistics", "tours", "trends"] as const;
export const operationTabs = [
  "adjust",
  "analysis",
  "calendar",
  "compose",
  "dashboard",
  "editor",
  "events",
  "history",
  "list",
  "performance",
  "snapshots",
  "status",
  "visits",
] as const;

export function resolveAdminModule(segments: string[]): AdminModule {
  const first = segments[0];

  if (["audit", "customers", "operations", "revenue", "staff", "system"].includes(first)) {
    return first as AdminModule;
  }

  return "overview";
}

export function roleDefaults(role: AdminStaffRole) {
  return role === "administrative_staff"
    ? { department: "Administration", permissions: adminPermissions }
    : { department: "Operations and Statistics", permissions: operationsPermissions };
}
