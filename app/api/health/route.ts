import { NextResponse } from "next/server";

import { checkScyllaHealth } from "@/lib/server/scylla";
import type { HealthResponse } from "@/lib/shared/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown ScyllaDB connection error.";
}

export async function GET() {
  const startedAt = performance.now();
  const timestamp = new Date().toISOString();

  try {
    const database = await checkScyllaHealth();
    const body: HealthResponse = {
      status: "ok",
      database: {
        status: "ok",
        ...database,
      },
      latencyMs: Math.round(performance.now() - startedAt),
      timestamp,
    };

    console.info(
      `[health] ScyllaDB connection ok keyspace=${database.keyspace} datacenter=${database.dataCenter ?? "unknown"} latencyMs=${body.latencyMs} release=${database.releaseVersion ?? "unknown"}`,
    );

    return NextResponse.json(body, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const body: HealthResponse = {
      status: "error",
      database: {
        status: "error",
        message: getErrorMessage(error),
      },
      latencyMs: Math.round(performance.now() - startedAt),
      timestamp,
    };

    console.error(
      `[health] ScyllaDB connection failed latencyMs=${body.latencyMs} message="${body.database.message}"`,
    );

    return NextResponse.json(body, {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}
