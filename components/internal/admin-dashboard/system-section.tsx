"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FiSave } from "react-icons/fi";

import { useToast } from "@/components/ui/toast";
import {
  createAdminSystemBackup,
  createAdminSystemTask,
  getAdminSystemBackups,
  getAdminSystemTasks,
  restoreAdminSystemBackup,
  runAdminMaintenance,
  updateAdminSystemTaskStatus,
  type ApiError,
} from "@/lib/client/api-client";
import type {
  AdminBackupMode,
  AdminSystemTask,
  AdminSystemTaskMutationRequest,
} from "@/lib/shared/internal";

import { WorkspaceTabs } from "../catalog-workspace-ui";
import { EmptyState, InternalPanel, StatusPill } from "../internal-primitives";
import { defaultTaskForm, systemTabs, type SystemTab } from "./config";
import { BackupList, SelectInput, TextInput } from "./controls";

export function AdminSystemSection({ tab }: { tab: SystemTab }) {
  const pathname = usePathname();
  const activeTab = ["backups", "health", "jobs", "maintenance", "restore", "tasks"].includes(tab) ? tab : "tasks";

  return (
    <div className="space-y-5">
      <WorkspaceTabs pathname={pathname} tabs={systemTabs} />
      {activeTab === "tasks" ? <SystemTasksPanel /> : null}
      {activeTab === "jobs" ? <SystemJobsPanel /> : null}
      {activeTab === "backups" ? <SystemBackupsPanel /> : null}
      {activeTab === "restore" ? <SystemRestorePanel /> : null}
      {activeTab === "maintenance" ? <SystemMaintenancePanel /> : null}
      {activeTab === "health" ? <SystemHealthPanel /> : null}
    </div>
  );
}

function SystemTasksPanel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [form, setForm] = useState<AdminSystemTaskMutationRequest>(defaultTaskForm);
  const tasksQuery = useQuery({
    queryKey: ["internal", "admin", "system", "tasks"] as const,
    queryFn: getAdminSystemTasks,
  });
  const tasks = tasksQuery.data?.tasks ?? [];
  const createMutation = useMutation({
    mutationFn: () => createAdminSystemTask(form),
    onSuccess: async () => {
      setForm(defaultTaskForm);
      await queryClient.invalidateQueries({ queryKey: ["internal", "admin", "system", "tasks"] });
      showToast({ message: "Task hệ thống đã được tạo.", title: "Đã tạo", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Không thể tạo task", variant: "error" }),
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <InternalPanel className="p-4">
        <h2 className="text-base font-semibold">Tạo task hệ thống</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <TextInput label="Tiêu đề" onChange={(value) => setForm((current) => ({ ...current, title: value }))} value={form.title} />
          <SelectInput
            label="Loại task"
            onChange={(value) => setForm((current) => ({ ...current, taskType: value as AdminSystemTaskMutationRequest["taskType"] }))}
            options={[
              { label: "Backup", value: "backup" },
              { label: "Maintenance", value: "maintenance" },
              { label: "Restore", value: "restore" },
              { label: "System update", value: "system_update" },
            ]}
            value={form.taskType}
          />
          <SelectInput
            label="Ưu tiên"
            onChange={(value) => setForm((current) => ({ ...current, priority: value as AdminSystemTaskMutationRequest["priority"] }))}
            options={[
              { label: "Low", value: "low" },
              { label: "Medium", value: "medium" },
              { label: "High", value: "high" },
              { label: "Urgent", value: "urgent" },
            ]}
            value={form.priority}
          />
          <TextInput label="Hạn xử lý" onChange={(value) => setForm((current) => ({ ...current, dueAt: value || null }))} type="datetime-local" value={form.dueAt ?? ""} />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={createMutation.isPending} type="submit">
            <FiSave size={16} />
            Tạo task
          </button>
        </form>
      </InternalPanel>

      <SystemTaskList tasks={tasks} isLoading={tasksQuery.isLoading} />
    </div>
  );
}

function SystemJobsPanel() {
  const tasksQuery = useQuery({
    queryKey: ["internal", "admin", "system", "tasks"] as const,
    queryFn: getAdminSystemTasks,
  });
  const tasks = (tasksQuery.data?.tasks ?? []).filter((task) => task.status === "running" || task.status === "pending");

  return <SystemTaskList isLoading={tasksQuery.isLoading} tasks={tasks} title="Job đang chờ/chạy" />;
}

function SystemTaskList({
  isLoading,
  tasks,
  title = "Task gần đây",
}: {
  isLoading: boolean;
  tasks: AdminSystemTask[];
  title?: string;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const updateMutation = useMutation({
    mutationFn: ({ status, task }: { status: AdminSystemTask["status"]; task: AdminSystemTask }) =>
      updateAdminSystemTaskStatus(task.taskId, {
        completedAt: status === "completed" ? new Date().toISOString() : null,
        createdAt: task.createdAt,
        currentStatus: task.status,
        status,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "admin", "system", "tasks"] });
      showToast({ message: "Trạng thái task đã được cập nhật.", title: "Đã lưu", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Không thể cập nhật task", variant: "error" }),
  });

  return (
    <InternalPanel className="p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 space-y-3">
        {tasks.length === 0 ? (
          <EmptyState message={isLoading ? "Đang tải task..." : "Chưa có task hệ thống."} />
        ) : (
          tasks.map((task) => (
            <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={`${task.status}-${task.createdAt}-${task.taskId}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{task.taskType} - {task.priority}</p>
                </div>
                <StatusPill value={task.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["running", "completed", "failed", "cancelled"] as const).map((status) => (
                  <button
                    className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-semibold dark:border-neutral-800"
                    disabled={updateMutation.isPending || task.status === status}
                    key={status}
                    onClick={() => updateMutation.mutate({ status, task })}
                    type="button"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </InternalPanel>
  );
}

function SystemBackupsPanel() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const backupsQuery = useQuery({
    queryKey: ["internal", "admin", "system", "backups"] as const,
    queryFn: getAdminSystemBackups,
  });
  const backupMutation = useMutation({
    mutationFn: (backupType: AdminBackupMode) => createAdminSystemBackup({ backupType }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "admin", "system", "backups"] });
      showToast({ message: "Backup hệ thống đã hoàn tất hoặc đã được ghi trạng thái.", title: "Đã chạy backup", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Backup thất bại", variant: "error" }),
  });

  return (
    <InternalPanel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Backup dữ liệu</h2>
        <div className="flex flex-wrap gap-2">
          <button className="h-10 rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white disabled:opacity-60" disabled={backupMutation.isPending} onClick={() => backupMutation.mutate("cql_dump")} type="button">
            CQL dump
          </button>
          <button className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:opacity-60 dark:border-neutral-800" disabled={backupMutation.isPending} onClick={() => backupMutation.mutate("snapshot")} type="button">
            Snapshot
          </button>
        </div>
      </div>
      <BackupList backups={backupsQuery.data?.backups ?? []} isLoading={backupsQuery.isLoading} />
    </InternalPanel>
  );
}

function SystemRestorePanel() {
  const { showToast } = useToast();
  const backupsQuery = useQuery({
    queryKey: ["internal", "admin", "system", "backups"] as const,
    queryFn: getAdminSystemBackups,
  });
  const [selectedBackupId, setSelectedBackupId] = useState("");
  const [confirm, setConfirm] = useState("");
  const backups = backupsQuery.data?.backups ?? [];
  const selectedBackup = backups.find((backup) => backup.backupId === selectedBackupId) ?? backups[0] ?? null;
  const restoreMutation = useMutation({
    mutationFn: () => {
      if (!selectedBackup) {
        throw new Error("Chưa chọn backup.");
      }

      return restoreAdminSystemBackup({
        backupDay: selectedBackup.backupDay,
        backupId: selectedBackup.backupId,
        backupTime: selectedBackup.backupTime,
        confirm: "RESTORE_DATABASE",
      });
    },
    onSuccess: () => showToast({ message: "Dữ liệu đã được khôi phục từ backup CQL.", title: "Đã restore", variant: "success" }),
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Restore thất bại", variant: "error" }),
  });

  return (
    <InternalPanel className="p-4">
      <h2 className="text-base font-semibold">Khôi phục dữ liệu</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <label className="space-y-2">
          <span className="text-sm font-semibold">Backup</span>
          <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" onChange={(event) => setSelectedBackupId(event.target.value)} value={selectedBackup?.backupId ?? ""}>
            {backups.map((backup) => (
              <option key={backup.backupId} value={backup.backupId}>
                {backup.backupDay} - {backup.backupType} - {backup.status}
              </option>
            ))}
          </select>
        </label>
        <TextInput label="Nhập RESTORE_DATABASE" onChange={setConfirm} value={confirm} />
        <button
          className="mt-auto h-11 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
          disabled={restoreMutation.isPending || confirm !== "RESTORE_DATABASE" || selectedBackup?.backupType !== "cql_dump"}
          onClick={() => restoreMutation.mutate()}
          type="button"
        >
          Restore
        </button>
      </div>
      {selectedBackup?.backupType === "snapshot" ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">Snapshot restore cần thao tác storage thủ công trong container ScyllaDB.</p>
      ) : null}
      <BackupList backups={backups} isLoading={backupsQuery.isLoading} />
    </InternalPanel>
  );
}

function SystemMaintenancePanel() {
  const { showToast } = useToast();
  const [output, setOutput] = useState("");
  const maintenanceMutation = useMutation({
    mutationFn: (command: "cleanup" | "compact" | "repair") => runAdminMaintenance({ command }),
    onSuccess: (response) => {
      setOutput(response.output || "Lệnh đã chạy xong.");
      showToast({ message: "Lệnh bảo trì đã chạy xong.", title: "Đã bảo trì", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Bảo trì thất bại", variant: "error" }),
  });

  return (
    <InternalPanel className="p-4">
      <h2 className="text-base font-semibold">Bảo trì ScyllaDB</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["cleanup", "compact", "repair"] as const).map((command) => (
          <button
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold disabled:opacity-60 dark:border-neutral-800"
            disabled={maintenanceMutation.isPending}
            key={command}
            onClick={() => maintenanceMutation.mutate(command)}
            type="button"
          >
            nodetool {command}
          </button>
        ))}
      </div>
      {output ? (
        <pre className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs dark:border-neutral-800 dark:bg-neutral-950">
          {output}
        </pre>
      ) : null}
    </InternalPanel>
  );
}

function SystemHealthPanel() {
  const tasksQuery = useQuery({
    queryKey: ["internal", "admin", "system", "tasks"] as const,
    queryFn: getAdminSystemTasks,
  });
  const backupsQuery = useQuery({
    queryKey: ["internal", "admin", "system", "backups"] as const,
    queryFn: getAdminSystemBackups,
  });
  const tasks = tasksQuery.data?.tasks ?? [];
  const backups = backupsQuery.data?.backups ?? [];

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <MetricPanel label="Task pending/running" value={String(tasks.filter((task) => task.status === "pending" || task.status === "running").length)} />
      <MetricPanel label="Backup hoàn tất" value={String(backups.filter((backup) => backup.status === "completed").length)} />
      <MetricPanel label="Backup lỗi" value={String(backups.filter((backup) => backup.status === "failed").length)} />
    </div>
  );
}

function MetricPanel({ label, value }: { label: string; value: string }) {
  return (
    <InternalPanel className="p-4">
      <p className="text-sm text-slate-500 dark:text-neutral-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </InternalPanel>
  );
}
