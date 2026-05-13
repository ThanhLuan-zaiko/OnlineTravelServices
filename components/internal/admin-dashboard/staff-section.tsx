"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiSave, FiTrash2 } from "react-icons/fi";

import { useToast } from "@/components/ui/toast";
import {
  createAdminStaff,
  getAdminStaffPage,
  hardDeleteAdminStaff,
  updateAdminStaff,
  type ApiError,
} from "@/lib/client/api-client";
import type {
  AdminStaffAccount,
  AdminStaffCreateRequest,
  AdminStaffRole,
  AdminStaffStatus,
  AdminStaffUpdateRequest,
} from "@/lib/shared/internal";

import { WorkspaceTabs } from "../catalog-workspace-ui";
import { EmptyState, InternalPanel, StatusPill } from "../internal-primitives";
import {
  adminPermissions,
  defaultCreateForm,
  operationsPermissions,
  roleDefaults,
  roleOptions,
  staffTabs,
  statusOptions,
  superAdminPermissions,
  type StaffTab,
} from "./config";
import { PermissionChecklist, SelectInput, TextInput } from "./controls";

export function AdminStaffSection({ tab }: { tab: StaffTab }) {
  const pathname = usePathname();
  const activeTab = ["activity", "create", "disabled", "list", "permissions", "roles"].includes(tab) ? tab : "list";

  return (
    <div className="space-y-5">
      <WorkspaceTabs pathname={pathname} tabs={staffTabs} />
      {activeTab === "create" ? <StaffCreatePanel /> : null}
      {activeTab === "roles" ? <StaffRolesPanel /> : null}
      {activeTab === "permissions" ? <StaffPermissionMatrixPanel /> : null}
      {activeTab === "activity" ? <StaffActivityPanel /> : null}
      {activeTab === "disabled" ? <StaffListPanel initialStatus="inactive" /> : null}
      {activeTab === "list" ? <StaffListPanel /> : null}
    </div>
  );
}

function StaffListPanel({ initialStatus = "all" }: { initialStatus?: AdminStaffStatus | "all" }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [role, setRole] = useState<AdminStaffRole | "all">("all");
  const [status, setStatus] = useState<AdminStaffStatus | "all">(initialStatus);
  const [selectedStaff, setSelectedStaff] = useState<AdminStaffAccount | null>(null);
  const [editForm, setEditForm] = useState<AdminStaffUpdateRequest | null>(null);
  const staffQuery = useQuery({
    queryKey: ["internal", "admin", "staff", role, status] as const,
    queryFn: () => getAdminStaffPage({ role, status }),
  });
  const staff = staffQuery.data?.staff ?? [];

  const selectStaff = (item: AdminStaffAccount) => {
    setSelectedStaff(item);
    setEditForm({
      department: item.department,
      fullName: item.fullName,
      permissions: item.permissions,
      role: item.role,
      staffLevel: item.staffLevel,
      status: item.status,
    });
  };

  const updateMutation = useMutation({
    mutationFn: () => updateAdminStaff(selectedStaff?.staffId ?? "", editForm as AdminStaffUpdateRequest),
    onSuccess: async (response) => {
      setSelectedStaff(response.staff);
      setEditForm({
        department: response.staff.department,
        fullName: response.staff.fullName,
        permissions: response.staff.permissions,
        role: response.staff.role,
        staffLevel: response.staff.staffLevel,
        status: response.staff.status,
      });
      await queryClient.invalidateQueries({ queryKey: ["internal", "admin", "staff"] });
      showToast({ message: "Thông tin nhân viên đã được cập nhật.", title: "Đã lưu", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Không thể cập nhật", variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => hardDeleteAdminStaff(selectedStaff?.staffId ?? ""),
    onSuccess: async () => {
      setSelectedStaff(null);
      setEditForm(null);
      await queryClient.invalidateQueries({ queryKey: ["internal", "admin", "staff"] });
      showToast({ message: "Nhân viên đã bị xóa cứng khỏi các bảng tài khoản.", title: "Đã xóa", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Không thể xóa", variant: "error" }),
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <InternalPanel className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput
            label="Role"
            onChange={(value) => setRole(value as AdminStaffRole | "all")}
            options={[{ label: "Tất cả", value: "all" }, ...roleOptions]}
            value={role}
          />
          <SelectInput label="Trạng thái" onChange={(value) => setStatus(value as AdminStaffStatus | "all")} options={statusOptions} value={status} />
        </div>
        <div className="mt-4 space-y-3">
          {staff.length === 0 ? (
            <EmptyState message={staffQuery.isLoading ? "Đang tải nhân viên..." : "Chưa có nhân viên phù hợp."} />
          ) : (
            staff.map((item) => (
              <button
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedStaff?.staffId === item.staffId
                    ? "border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30"
                    : "border-slate-200 bg-white hover:border-sky-200 dark:border-neutral-800 dark:bg-black"
                }`}
                key={item.staffId}
                onClick={() => selectStaff(item)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{item.fullName}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{item.email}</p>
                  </div>
                  <StatusPill value={item.status} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{item.role} - {item.department}</p>
              </button>
            ))
          )}
        </div>
      </InternalPanel>

      <InternalPanel className="p-4">
        {!selectedStaff || !editForm ? (
          <EmptyState message="Chọn một nhân viên để cập nhật." />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{selectedStaff.fullName}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedStaff.email} - {selectedStaff.phone}</p>
              </div>
              <StatusPill value={selectedStaff.role} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Họ tên" onChange={(value) => setEditForm((current) => current && { ...current, fullName: value })} value={editForm.fullName} />
              <TextInput label="Phòng ban" onChange={(value) => setEditForm((current) => current && { ...current, department: value })} value={editForm.department} />
              <TextInput label="Cấp nhân sự" onChange={(value) => setEditForm((current) => current && { ...current, staffLevel: value })} value={editForm.staffLevel} />
              <SelectInput label="Trạng thái" onChange={(value) => setEditForm((current) => current && { ...current, status: value as AdminStaffStatus })} options={statusOptions.filter((item) => item.value !== "all")} value={editForm.status} />
              <SelectInput
                label="Role"
                onChange={(value) => {
                  const nextRole = value as AdminStaffRole;
                  const defaults = roleDefaults(nextRole);

                  setEditForm((current) =>
                    current && {
                      ...current,
                      department: defaults.department,
                      permissions: defaults.permissions,
                      role: nextRole,
                    },
                  );
                }}
                options={roleOptions}
                value={editForm.role}
              />
            </div>

            <PermissionChecklist
              permissions={editForm.permissions}
              setPermissions={(permissions) => setEditForm((current) => current && { ...current, permissions })}
            />

            <div className="flex flex-wrap gap-3">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate()}
                type="button"
              >
                <FiSave size={16} />
                Lưu cập nhật
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 disabled:opacity-60 dark:border-rose-900 dark:text-rose-300"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm("Xóa cứng nhân viên này khỏi các bảng tài khoản?")) {
                    deleteMutation.mutate();
                  }
                }}
                type="button"
              >
                <FiTrash2 size={16} />
                Xóa cứng
              </button>
            </div>
          </div>
        )}
      </InternalPanel>
    </div>
  );
}

function StaffCreatePanel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<AdminStaffCreateRequest>(defaultCreateForm);
  const createMutation = useMutation({
    mutationFn: () => createAdminStaff(form),
    onSuccess: async () => {
      setForm(defaultCreateForm);
      await queryClient.invalidateQueries({ queryKey: ["internal", "admin", "staff"] });
      showToast({ message: "Tài khoản staff đã được tạo theo rule seed.", title: "Đã tạo", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Không thể tạo", variant: "error" }),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    createMutation.mutate();
  };

  return (
    <InternalPanel className="p-4">
      <h2 className="text-base font-semibold">Tạo tài khoản nhân viên</h2>
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextInput label="Họ tên" onChange={(value) => setForm((current) => ({ ...current, fullName: value }))} value={form.fullName} />
          <TextInput label="Email" onChange={(value) => setForm((current) => ({ ...current, email: value }))} type="email" value={form.email} />
          <TextInput label="Số điện thoại" onChange={(value) => setForm((current) => ({ ...current, phone: value }))} value={form.phone} />
          <TextInput label="Mật khẩu" onChange={(value) => setForm((current) => ({ ...current, password: value }))} type="password" value={form.password} />
          <SelectInput
            label="Role"
            onChange={(value) => {
              const role = value as AdminStaffRole;
              const defaults = roleDefaults(role);

              setForm((current) => ({
                ...current,
                department: defaults.department,
                permissions: defaults.permissions,
                role,
              }));
            }}
            options={roleOptions}
            value={form.role}
          />
          <TextInput label="Cấp nhân sự" onChange={(value) => setForm((current) => ({ ...current, staffLevel: value }))} value={form.staffLevel} />
          <TextInput label="Phòng ban" onChange={(value) => setForm((current) => ({ ...current, department: value }))} value={form.department} />
        </div>
        <PermissionChecklist permissions={form.permissions} setPermissions={(permissions) => setForm((current) => ({ ...current, permissions }))} />
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
          disabled={createMutation.isPending}
          type="submit"
        >
          <FiSave size={16} />
          Tạo nhân viên
        </button>
      </form>
    </InternalPanel>
  );
}

function StaffRolesPanel() {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <RolePermissionPanel title="Admin tổng (seed-only)" permissions={superAdminPermissions} />
      <RolePermissionPanel title="Administrative staff" permissions={adminPermissions} />
      <RolePermissionPanel title="Operations statistics staff" permissions={operationsPermissions} />
    </div>
  );
}

function StaffPermissionMatrixPanel() {
  const rows = Array.from(new Set([...superAdminPermissions, ...adminPermissions, ...operationsPermissions])).sort();

  return (
    <InternalPanel className="p-4">
      <h2 className="text-base font-semibold">Ma trận quyền</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500 dark:text-neutral-500">
            <tr>
              <th className="px-3 py-3">Permission</th>
              <th className="px-3 py-3">Admin tổng</th>
              <th className="px-3 py-3">Admin</th>
              <th className="px-3 py-3">Operations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
            {rows.map((permission) => (
              <tr key={permission}>
                <td className="px-3 py-3 font-semibold">{permission}</td>
                <td className="px-3 py-3">{superAdminPermissions.includes(permission) ? "Có" : "-"}</td>
                <td className="px-3 py-3">{adminPermissions.includes(permission) ? "Có" : "-"}</td>
                <td className="px-3 py-3">{operationsPermissions.includes(permission) ? "Có" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </InternalPanel>
  );
}

function RolePermissionPanel({ permissions, title }: { permissions: string[]; title: string }) {
  return (
    <InternalPanel className="p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {permissions.map((permission) => (
          <StatusPill key={permission} value={permission} />
        ))}
      </div>
    </InternalPanel>
  );
}

function StaffActivityPanel() {
  const staffQuery = useQuery({
    queryKey: ["internal", "admin", "staff", "activity"] as const,
    queryFn: () => getAdminStaffPage({ role: "all", status: "all" }),
  });
  const staff = staffQuery.data?.staff ?? [];

  return (
    <InternalPanel className="p-4">
      <h2 className="text-base font-semibold">Theo dõi hiệu suất nhân viên</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500 dark:text-neutral-500">
            <tr>
              <th className="px-3 py-3">Nhân viên</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Phòng ban</th>
              <th className="px-3 py-3">Trạng thái</th>
              <th className="px-3 py-3">Hoạt động cuối</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
            {staff.map((item) => (
              <tr key={item.staffId}>
                <td className="px-3 py-3 font-semibold">{item.fullName}</td>
                <td className="px-3 py-3">{item.role}</td>
                <td className="px-3 py-3">{item.department}</td>
                <td className="px-3 py-3"><StatusPill value={item.status} /></td>
                <td className="px-3 py-3">{item.lastActivityAt ?? "Chưa ghi nhận"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {staff.length === 0 ? <EmptyState message={staffQuery.isLoading ? "Đang tải nhân viên..." : "Chưa có dữ liệu nhân viên."} /> : null}
    </InternalPanel>
  );
}
