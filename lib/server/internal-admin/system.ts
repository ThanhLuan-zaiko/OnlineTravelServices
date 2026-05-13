import "server-only";

import { types } from "cassandra-driver";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { uuidv7 } from "uuidv7";

import { AuthError } from "@/lib/server/auth";
import { writeInternalAuditEvent } from "@/lib/server/internal-data/audit";
import { executeBatch, executeQuery } from "@/lib/server/scylla";
import type { AuthUser } from "@/lib/shared/auth";
import type {
  AdminBackupMode,
  AdminBackupMutationRequest,
  AdminMaintenanceMutationRequest,
  AdminRestoreMutationRequest,
  AdminSystemBackup,
  AdminSystemTask,
  AdminSystemTaskMutationRequest,
  AdminSystemTaskStatus,
  AdminSystemTaskStatusMutationRequest,
} from "@/lib/shared/internal";

import { BACKUP_ROOT, CQL_REQUEST_TIMEOUT_SECONDS, KEYSPACE, SCYLLA_CONTAINER_NAME } from "./constants";

const execFileAsync = promisify(execFile);
const BACKUP_ROOT_PATH = path.isAbsolute(BACKUP_ROOT)
  ? BACKUP_ROOT
  : path.join(/* turbopackIgnore: true */ process.cwd(), BACKUP_ROOT);
const SCHEMA_PATH = path.join(process.cwd(), "schema.cql");

type SystemTaskRow = {
  assigned_to: string | null;
  completed_at: Date | string | null;
  created_at: string;
  due_at: Date | string | null;
  priority: AdminSystemTask["priority"];
  task_id: string;
  task_status: AdminSystemTaskStatus;
  task_type: AdminSystemTask["taskType"];
  title: string;
};

type SystemBackupRow = {
  backup_day: Date | string;
  backup_id: string;
  backup_time: string;
  backup_type: AdminBackupMode;
  finished_at: Date | string | null;
  size_bytes: bigint | number | { toNumber?: () => number } | null;
  started_by: string;
  status: AdminSystemBackup["status"];
  storage_uri: string;
};

function toIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : String(value);
}

function toSystemTask(row: SystemTaskRow): AdminSystemTask {
  return {
    assignedTo: row.assigned_to ? String(row.assigned_to) : null,
    completedAt: toIso(row.completed_at),
    createdAt: String(row.created_at),
    dueAt: toIso(row.due_at),
    priority: row.priority,
    status: row.task_status,
    taskId: String(row.task_id),
    taskType: row.task_type,
    title: row.title,
  };
}

function toBackup(row: SystemBackupRow): AdminSystemBackup {
  const sizeBytes =
    typeof row.size_bytes === "bigint"
      ? Number(row.size_bytes)
      : typeof row.size_bytes === "number"
        ? row.size_bytes
        : row.size_bytes?.toNumber?.() ?? 0;

  return {
    backupDay: String(row.backup_day).slice(0, 10),
    backupId: String(row.backup_id),
    backupTime: String(row.backup_time),
    backupType: row.backup_type,
    finishedAt: toIso(row.finished_at),
    sizeBytes,
    startedBy: String(row.started_by),
    status: row.status,
    storageUri: row.storage_uri,
  };
}

export async function listAdminSystemTasks() {
  const statuses: AdminSystemTaskStatus[] = ["pending", "running", "completed", "failed", "cancelled"];
  const rows: SystemTaskRow[] = [];

  for (const status of statuses) {
    rows.push(
      ...(await executeQuery<SystemTaskRow>(
        `SELECT task_status, created_at, task_id, task_type, title, assigned_to, priority, due_at, completed_at
         FROM admin_system_tasks
         WHERE task_status = ?
         LIMIT 40`,
        [status],
      )),
    );
  }

  return rows.map(toSystemTask).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createAdminSystemTask(input: AdminSystemTaskMutationRequest, actor: AuthUser, request?: Request) {
  const taskId = String(uuidv7());
  const createdAt = String(types.TimeUuid.now());

  await executeQuery(
    `INSERT INTO admin_system_tasks
      (task_status, created_at, task_id, task_type, title, assigned_to, priority, due_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["pending", createdAt, taskId, input.taskType, input.title, input.assignedTo ?? null, input.priority, input.dueAt ? new Date(input.dueAt) : null, null],
  );

  await writeInternalAuditEvent({
    action: "admin_system_task_created",
    actor,
    description: `Tạo task hệ thống: ${input.title}.`,
    entityId: taskId,
    entityType: "admin_system_task",
    request,
  });

  return {
    assignedTo: input.assignedTo ?? null,
    completedAt: null,
    createdAt,
    dueAt: input.dueAt ?? null,
    priority: input.priority,
    status: "pending",
    taskId,
    taskType: input.taskType,
    title: input.title,
  } satisfies AdminSystemTask;
}

export async function updateAdminSystemTaskStatus(
  taskId: string,
  input: AdminSystemTaskStatusMutationRequest,
  actor: AuthUser,
  request?: Request,
) {
  const rows = await executeQuery<SystemTaskRow>(
    `SELECT task_status, created_at, task_id, task_type, title, assigned_to, priority, due_at, completed_at
     FROM admin_system_tasks
     WHERE task_status = ? AND created_at = ? AND task_id = ?`,
    [input.currentStatus, input.createdAt, taskId],
  );
  const current = rows[0];

  if (!current) {
    throw new AuthError("Không tìm thấy task hệ thống.", 404);
  }

  const completedAt = input.completedAt ? new Date(input.completedAt) : input.status === "completed" ? new Date() : current.completed_at;

  if (input.status !== input.currentStatus) {
    await executeBatch([
      {
        query: "DELETE FROM admin_system_tasks WHERE task_status = ? AND created_at = ? AND task_id = ?",
        params: [input.currentStatus, input.createdAt, taskId],
      },
      {
        query: `INSERT INTO admin_system_tasks
          (task_status, created_at, task_id, task_type, title, assigned_to, priority, due_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [input.status, input.createdAt, taskId, current.task_type, current.title, current.assigned_to, current.priority, current.due_at, completedAt],
      },
    ]);
  } else {
    await executeQuery(
      "UPDATE admin_system_tasks SET completed_at = ? WHERE task_status = ? AND created_at = ? AND task_id = ?",
      [completedAt, input.status, input.createdAt, taskId],
    );
  }

  await writeInternalAuditEvent({
    action: "admin_system_task_status_updated",
    actor,
    description: `Cập nhật task hệ thống ${taskId} sang ${input.status}.`,
    entityId: taskId,
    entityType: "admin_system_task",
    request,
  });

  return { ...toSystemTask(current), completedAt: toIso(completedAt), status: input.status };
}

function dateString(date = new Date()) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function timestampId(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function runDocker(args: string[]) {
  try {
    return await execFileAsync("docker", args, {
      maxBuffer: 1024 * 1024 * 80,
      windowsHide: true,
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code !== "ENOENT") {
      throw error;
    }

    return execFileAsync("wsl", ["docker", ...args], {
      maxBuffer: 1024 * 1024 * 80,
      windowsHide: true,
    });
  }
}

async function runCqlsh(args: string[]) {
  return runDocker(["exec", "-i", SCYLLA_CONTAINER_NAME, "cqlsh", `--request-timeout=${CQL_REQUEST_TIMEOUT_SECONDS}`, ...args]);
}

async function getProjectTables() {
  const rows = await executeQuery<{ table_name: string }>(
    "SELECT table_name FROM system_schema.tables WHERE keyspace_name = ?",
    [KEYSPACE],
  );

  return rows.map((row) => row.table_name).filter((table) => /^[A-Za-z][A-Za-z0-9_]*$/.test(table)).sort();
}

async function directorySizeBytes(root: string): Promise<number> {
  const current = await stat(root);

  if (current.isFile()) {
    return current.size;
  }

  const entries = await readdir(root);
  let total = 0;

  for (const entry of entries) {
    total += await directorySizeBytes(path.join(root, entry));
  }

  return total;
}

async function insertBackupRecord(input: {
  backupDay: string;
  backupId: string;
  backupTime: string;
  backupType: AdminBackupMode;
  finishedAt: Date | null;
  sizeBytes: number;
  startedBy: string;
  status: AdminSystemBackup["status"];
  storageUri: string;
}) {
  await executeQuery(
    `INSERT INTO system_backups
      (backup_day, backup_time, backup_id, backup_type, status, storage_uri, size_bytes, started_by, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [types.LocalDate.fromString(input.backupDay), input.backupTime, input.backupId, input.backupType, input.status, input.storageUri, input.sizeBytes, input.startedBy, input.finishedAt],
  );
}

export async function listAdminSystemBackups(days = 30) {
  const backups: AdminSystemBackup[] = [];

  for (let index = 0; index < days; index += 1) {
    const day = new Date();
    day.setDate(day.getDate() - index);
    const backupDay = dateString(day);
    const rows = await executeQuery<SystemBackupRow>(
      `SELECT backup_day, backup_time, backup_id, backup_type, status, storage_uri, size_bytes, started_by, finished_at
       FROM system_backups
       WHERE backup_day = ?
       LIMIT 40`,
      [types.LocalDate.fromString(backupDay)],
    );

    backups.push(...rows.map(toBackup));
  }

  return backups.sort((a, b) => b.backupTime.localeCompare(a.backupTime));
}

async function createCqlDumpBackup(backupDir: string) {
  const dataDir = path.join(backupDir, "data");
  const tables = await getProjectTables();

  await mkdir(dataDir, { recursive: true });
  await writeFile(path.join(backupDir, "schema.cql"), await readFile(SCHEMA_PATH, "utf8"), "utf8");

  for (const table of tables) {
    const { stdout } = await runCqlsh(["-e", `COPY ${KEYSPACE}.${table} TO STDOUT WITH HEADER = TRUE;`]);

    await writeFile(path.join(dataDir, `${table}.csv`), stdout, "utf8");
  }

  await writeFile(path.join(backupDir, "manifest.json"), JSON.stringify({ createdAt: new Date().toISOString(), keyspace: KEYSPACE, mode: "cql_dump", tables }, null, 2), "utf8");
}

async function createSnapshotBackup(tag: string) {
  await runDocker(["exec", SCYLLA_CONTAINER_NAME, "nodetool", "snapshot", "-t", tag, KEYSPACE]);
}

export async function createAdminSystemBackup(input: AdminBackupMutationRequest, actor: AuthUser, request?: Request) {
  const now = new Date();
  const backupId = String(uuidv7());
  const backupDay = dateString(now);
  const backupTime = String(types.TimeUuid.now());
  const backupDir = path.join(BACKUP_ROOT_PATH, `${backupDay}-${timestampId(now)}-${input.backupType}-${backupId}`);

  await mkdir(backupDir, { recursive: true });
  await insertBackupRecord({ backupDay, backupId, backupTime, backupType: input.backupType, finishedAt: null, sizeBytes: 0, startedBy: actor.userId, status: "running", storageUri: backupDir });

  try {
    if (input.backupType === "cql_dump") {
      await createCqlDumpBackup(backupDir);
    } else {
      const tag = `ots-${backupId}`;

      await createSnapshotBackup(tag);
      await writeFile(path.join(backupDir, "manifest.json"), JSON.stringify({ container: SCYLLA_CONTAINER_NAME, createdAt: new Date().toISOString(), keyspace: KEYSPACE, mode: "snapshot", snapshotTag: tag }, null, 2), "utf8");
    }

    const sizeBytes = await directorySizeBytes(backupDir);

    await insertBackupRecord({ backupDay, backupId, backupTime, backupType: input.backupType, finishedAt: new Date(), sizeBytes, startedBy: actor.userId, status: "completed", storageUri: backupDir });
    await writeInternalAuditEvent({ action: "admin_system_backup_created", actor, description: `Tạo backup ${input.backupType}.`, entityId: backupId, entityType: "system_backup", request });

    return (await listAdminSystemBackups(1)).find((backup) => backup.backupId === backupId) ?? null;
  } catch (error) {
    await insertBackupRecord({ backupDay, backupId, backupTime, backupType: input.backupType, finishedAt: new Date(), sizeBytes: 0, startedBy: actor.userId, status: "failed", storageUri: backupDir });
    await rm(backupDir, { force: true, recursive: true }).catch(() => undefined);
    throw error;
  }
}

export async function restoreAdminSystemBackup(input: AdminRestoreMutationRequest, actor: AuthUser, request?: Request) {
  const rows = await executeQuery<SystemBackupRow>(
    `SELECT backup_day, backup_time, backup_id, backup_type, status, storage_uri, size_bytes, started_by, finished_at
     FROM system_backups
     WHERE backup_day = ? AND backup_time = ? AND backup_id = ?`,
    [types.LocalDate.fromString(input.backupDay), input.backupTime, input.backupId],
  );
  const backup = rows[0] ? toBackup(rows[0]) : null;

  if (!backup || backup.status !== "completed") {
    throw new AuthError("Backup không tồn tại hoặc chưa hoàn thành.", 404);
  }

  const manifest = JSON.parse(await readFile(path.join(backup.storageUri, "manifest.json"), "utf8")) as {
    mode: AdminBackupMode;
    tables?: string[];
  };

  if (manifest.mode !== "cql_dump") {
    throw new AuthError("Snapshot restore cần thao tác thủ công với dữ liệu trong container ScyllaDB.", 400);
  }

  const containerRestorePath = `/tmp/ots_restore_${input.backupId}`;

  await runDocker(["exec", SCYLLA_CONTAINER_NAME, "rm", "-rf", containerRestorePath]).catch(() => undefined);
  await runDocker(["cp", backup.storageUri, `${SCYLLA_CONTAINER_NAME}:${containerRestorePath}`]);
  await runCqlsh(["-f", `${containerRestorePath}/schema.cql`]);

  for (const table of manifest.tables ?? []) {
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(table)) {
      continue;
    }

    await runCqlsh(["-e", `TRUNCATE TABLE ${KEYSPACE}.${table};`]);
    await runCqlsh(["-e", `COPY ${KEYSPACE}.${table} FROM '${containerRestorePath}/data/${table}.csv' WITH HEADER = TRUE;`]);
  }

  await runDocker(["exec", SCYLLA_CONTAINER_NAME, "rm", "-rf", containerRestorePath]).catch(() => undefined);
  await writeInternalAuditEvent({ action: "admin_system_backup_restored", actor, description: `Khôi phục backup ${input.backupId}.`, entityId: input.backupId, entityType: "system_backup", request });

  return backup;
}

export async function runAdminMaintenance(input: AdminMaintenanceMutationRequest, actor: AuthUser, request?: Request) {
  const commandMap: Record<AdminMaintenanceMutationRequest["command"], string[]> = {
    cleanup: ["cleanup", KEYSPACE],
    compact: ["compact", KEYSPACE],
    repair: ["repair", KEYSPACE],
  };
  const { stdout, stderr } = await runDocker(["exec", SCYLLA_CONTAINER_NAME, "nodetool", ...commandMap[input.command]]);

  await writeInternalAuditEvent({ action: "admin_system_maintenance_run", actor, description: `Chạy bảo trì hệ thống: ${input.command}.`, entityType: "system", request });

  return {
    output: [stdout, stderr].filter(Boolean).join("\n").trim(),
  };
}
