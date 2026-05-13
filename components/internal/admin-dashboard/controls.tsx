import { useMemo } from "react";

import type { AdminSystemBackup } from "@/lib/shared/internal";

import { EmptyState, StatusPill } from "../internal-primitives";
import { permissionOptions } from "./config";

export function BackupList({ backups, isLoading }: { backups: AdminSystemBackup[]; isLoading: boolean }) {
  return (
    <div className="mt-4 space-y-3">
      {backups.length === 0 ? (
        <EmptyState message={isLoading ? "Đang tải backup..." : "Chưa có backup hệ thống."} />
      ) : (
        backups.map((backup) => (
          <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={`${backup.backupDay}-${backup.backupTime}-${backup.backupId}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{backup.backupType} - {backup.backupDay}</p>
                <p className="mt-1 truncate text-sm text-slate-500">{backup.storageUri}</p>
              </div>
              <StatusPill value={backup.status} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{backup.sizeBytes.toLocaleString("vi-VN")} bytes</p>
          </div>
        ))
      )}
    </div>
  );
}

export function PermissionChecklist({
  permissions,
  setPermissions,
}: {
  permissions: string[];
  setPermissions: (permissions: string[]) => void;
}) {
  const selected = useMemo(() => new Set(permissions), [permissions]);

  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold">Quyền</span>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {permissionOptions.map((permission) => (
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-2 text-sm dark:border-neutral-800" key={permission}>
            <input
              checked={selected.has(permission)}
              className="h-4 w-4"
              onChange={(event) => {
                const next = new Set(selected);

                if (event.target.checked) {
                  next.add(permission);
                } else {
                  next.delete(permission);
                }

                setPermissions(Array.from(next).sort());
              }}
              type="checkbox"
            />
            {permission}
          </label>
        ))}
      </div>
    </div>
  );
}

export function TextInput({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <input
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-neutral-800 dark:bg-black"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

export function SelectInput({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <select
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-neutral-800 dark:bg-black"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
