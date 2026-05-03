import "server-only";

import { types } from "cassandra-driver";

import { executeQuery } from "@/lib/server/scylla";

function getClientIp(request: Request) {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;

  return ipAddress?.slice(0, 64) ?? null;
}

function getUserAgent(request: Request) {
  return request.headers.get("user-agent")?.slice(0, 512) ?? null;
}

export async function writeSecurityEvent(
  userId: string,
  eventType: string,
  request: Request,
  riskLevel: string,
  detail: string,
) {
  await executeQuery(
    `INSERT INTO user_security_events
      (user_id, event_time, event_type, ip_address, user_agent, risk_level, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      types.TimeUuid.now(),
      eventType,
      getClientIp(request),
      getUserAgent(request),
      riskLevel,
      detail,
    ],
  );
}
