import type {
  AdminBackupMutationRequest,
  AdminMaintenanceMutationRequest,
  AdminRestoreMutationRequest,
  AdminStaffAccount,
  AdminStaffCreateRequest,
  AdminStaffRole,
  AdminStaffStatus,
  AdminStaffUpdateRequest,
  AdminSystemBackup,
  AdminSystemTask,
  AdminSystemTaskMutationRequest,
  AdminSystemTaskStatusMutationRequest,
} from "@/lib/shared/internal";

import { apiClient } from "./core";

export async function getAdminStaffPage(input?: {
  role?: AdminStaffRole | "all";
  status?: AdminStaffStatus | "all";
}) {
  const response = await apiClient.get<{ staff: AdminStaffAccount[] }>("/internal/admin/staff", {
    params: {
      role: input?.role ?? "all",
      status: input?.status ?? "all",
    },
  });

  return response.data;
}

export async function createAdminStaff(input: AdminStaffCreateRequest) {
  const response = await apiClient.post<{ staff: AdminStaffAccount }>("/internal/admin/staff", input);

  return response.data;
}

export async function updateAdminStaff(staffId: string, input: AdminStaffUpdateRequest) {
  const response = await apiClient.patch<{ staff: AdminStaffAccount }>(`/internal/admin/staff/${staffId}`, input);

  return response.data;
}

export async function hardDeleteAdminStaff(staffId: string) {
  const response = await apiClient.delete<{ message: string }>(`/internal/admin/staff/${staffId}`, {
    data: { confirm: "DELETE_STAFF" },
  });

  return response.data;
}

export async function getAdminSystemTasks() {
  const response = await apiClient.get<{ tasks: AdminSystemTask[] }>("/internal/admin/system/tasks");

  return response.data;
}

export async function createAdminSystemTask(input: AdminSystemTaskMutationRequest) {
  const response = await apiClient.post<{ task: AdminSystemTask }>("/internal/admin/system/tasks", input);

  return response.data;
}

export async function updateAdminSystemTaskStatus(taskId: string, input: AdminSystemTaskStatusMutationRequest) {
  const response = await apiClient.patch<{ task: AdminSystemTask }>(`/internal/admin/system/tasks/${taskId}`, input);

  return response.data;
}

export async function getAdminSystemBackups() {
  const response = await apiClient.get<{ backups: AdminSystemBackup[] }>("/internal/admin/system/backups");

  return response.data;
}

export async function createAdminSystemBackup(input: AdminBackupMutationRequest) {
  const response = await apiClient.post<{ backup: AdminSystemBackup | null }>("/internal/admin/system/backups", input);

  return response.data;
}

export async function restoreAdminSystemBackup(input: AdminRestoreMutationRequest) {
  const response = await apiClient.post<{ backup: AdminSystemBackup }>("/internal/admin/system/restore", input);

  return response.data;
}

export async function runAdminMaintenance(input: AdminMaintenanceMutationRequest) {
  const response = await apiClient.post<{ output: string }>("/internal/admin/system/maintenance", input);

  return response.data;
}
