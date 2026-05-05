import "server-only";

import { Client, auth, types } from "cassandra-driver";

import { serverEnv } from "@/lib/server/env";

const HEALTH_CHECK_TIMEOUT_MS = 5_000;

type ScyllaGlobal = typeof globalThis & {
  scyllaClient?: Client;
};

export type ScyllaHealth = {
  clusterName: string | null;
  dataCenter: string | null;
  hostId: string | null;
  keyspace: string;
  releaseVersion: string | null;
};

function parseContactPoints(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry.includes(":")) {
        throw new Error(
          "Set ScyllaDB ports with SCYLLA_PORT instead of embedding ports in SCYLLA_CONTACT_POINTS.",
        );
      }

      return entry;
    });
}

function createAuthProvider() {
  if (serverEnv.SCYLLA_USERNAME || serverEnv.SCYLLA_PASSWORD) {
    if (!serverEnv.SCYLLA_USERNAME || !serverEnv.SCYLLA_PASSWORD) {
      throw new Error(
        "Both SCYLLA_USERNAME and SCYLLA_PASSWORD are required when ScyllaDB authentication is enabled.",
      );
    }

    return new auth.PlainTextAuthProvider(
      serverEnv.SCYLLA_USERNAME,
      serverEnv.SCYLLA_PASSWORD,
    );
  }

  return undefined;
}

function createScyllaClient() {
  const contactPoints = parseContactPoints(serverEnv.SCYLLA_CONTACT_POINTS);

  return new Client({
    contactPoints,
    keyspace: serverEnv.SCYLLA_KEYSPACE,
    localDataCenter: serverEnv.SCYLLA_LOCAL_DATACENTER,
    protocolOptions: {
      port: serverEnv.SCYLLA_PORT,
    },
    queryOptions: {
      consistency: types.consistencies.localQuorum,
      prepare: true,
    },
    socketOptions: {
      connectTimeout: HEALTH_CHECK_TIMEOUT_MS,
      readTimeout: HEALTH_CHECK_TIMEOUT_MS,
    },
    authProvider: createAuthProvider(),
  });
}

export function getScyllaClient() {
  const globalForScylla = globalThis as ScyllaGlobal;

  if (!globalForScylla.scyllaClient) {
    globalForScylla.scyllaClient = createScyllaClient();
  }

  return globalForScylla.scyllaClient;
}

export async function executeQuery<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
) {
  const result = await getScyllaClient().execute(query, params, {
    prepare: true,
  });

  return result.rows as T[];
}

export async function executePagedQuery<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
  options?: {
    fetchSize?: number;
    pageState?: string | Buffer | null;
  },
) {
  const result = await getScyllaClient().execute(
    query,
    params,
    {
      prepare: true,
      fetchSize: options?.fetchSize,
      pageState: options?.pageState ?? undefined,
    },
  );

  return {
    pageState: result.pageState ?? null,
    rows: result.rows as T[],
  };
}

export async function checkScyllaHealth(): Promise<ScyllaHealth> {
  const rows = await Promise.race([
    executeQuery<{
      cluster_name?: string;
      data_center?: string;
      host_id?: string;
      release_version?: string;
    }>(
      "SELECT cluster_name, data_center, host_id, release_version FROM system.local WHERE key = ?",
      ["local"],
    ),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            "ScyllaDB health check timed out. Run .\\reset_database.ps1 and retry.",
          ),
        );
      }, HEALTH_CHECK_TIMEOUT_MS);
    }),
  ]);

  const row = rows[0];

  return {
    clusterName: row?.cluster_name ?? null,
    dataCenter: row?.data_center ?? null,
    hostId: row?.host_id ?? null,
    keyspace: serverEnv.SCYLLA_KEYSPACE,
    releaseVersion: row?.release_version ?? null,
  };
}
