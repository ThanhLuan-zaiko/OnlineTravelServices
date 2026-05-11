import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type { AuthUser } from "@/lib/shared/auth";
import type { InternalAuditEvent } from "@/lib/shared/internal";

type AuditRow = {
  action: string;
  actor_id: string;
  actor_role: string;
  audit_id: string;
  description: string;
  entity_id: string | null;
  entity_type: string;
  event_time: unknown;
  ip_address: string | null;
};

type AuditEntityRow = Omit<AuditRow, "ip_address">;

function getClientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  )?.slice(0, 64) ?? null;
}

function toAuditEvent(row: AuditRow): InternalAuditEvent {
  return {
    action: row.action,
    actorId: String(row.actor_id),
    actorRole: row.actor_role,
    auditId: String(row.audit_id),
    description: row.description,
    entityId: row.entity_id ? String(row.entity_id) : null,
    entityType: row.entity_type,
    eventTime: String(row.event_time),
    ipAddress: row.ip_address,
  };
}

export async function writeInternalAuditEvent(input: {
  action: string;
  actor: AuthUser;
  description: string;
  entityId?: string | null;
  entityType: string;
  request?: Request;
}) {
  const auditId = String(uuidv7());
  const eventTime = String(types.TimeUuid.now());
  const entityId = input.entityId ?? null;
  const ipAddress = input.request ? getClientIp(input.request) : null;

  await executeQuery(
    `INSERT INTO audit_log_by_actor
      (actor_id, event_time, audit_id, actor_role, action, entity_type, entity_id, description, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.actor.userId,
      eventTime,
      auditId,
      input.actor.role,
      input.action,
      input.entityType,
      entityId,
      input.description,
      ipAddress,
    ],
  );

  if (entityId) {
    await executeQuery(
      `INSERT INTO audit_log_by_entity
        (entity_type, entity_id, event_time, audit_id, actor_id, actor_role, action, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.entityType,
        entityId,
        eventTime,
        auditId,
        input.actor.userId,
        input.actor.role,
        input.action,
        input.description,
      ],
    );
  }

  return auditId;
}

export async function listInternalAuditByActor(
  actorId: string,
  options?: {
    cursor?: string | null;
    limit?: number;
  },
) {
  const page = await executePagedQuery<AuditRow>(
    `SELECT actor_id, event_time, audit_id, actor_role, action, entity_type, entity_id, description, ip_address
     FROM audit_log_by_actor
     WHERE actor_id = ?`,
    [actorId],
    {
      fetchSize: Math.min(Math.max(options?.limit ?? 20, 1), 80),
      pageState: options?.cursor ?? null,
    },
  );

  return {
    audits: page.rows.map(toAuditEvent),
    nextCursor: page.pageState ? String(page.pageState) : null,
  };
}

export async function listInternalAuditByEntity(
  entityType: string,
  entityId: string,
  options?: {
    cursor?: string | null;
    limit?: number;
  },
) {
  const page = await executePagedQuery<AuditEntityRow>(
    `SELECT actor_id, event_time, audit_id, actor_role, action, entity_type, entity_id, description
     FROM audit_log_by_entity
     WHERE entity_type = ? AND entity_id = ?`,
    [entityType, entityId],
    {
      fetchSize: Math.min(Math.max(options?.limit ?? 20, 1), 80),
      pageState: options?.cursor ?? null,
    },
  );

  return {
    audits: page.rows.map((row) => toAuditEvent({ ...row, ip_address: null })),
    nextCursor: page.pageState ? String(page.pageState) : null,
  };
}
