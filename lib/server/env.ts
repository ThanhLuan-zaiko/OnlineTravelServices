import "server-only";

import { z } from "zod";

const envSchema = z.object({
  ADMIN_BACKUP_DIR: z.string().min(1).default("./backups"),
  ADMIN_CQL_REQUEST_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(120),
  ADMIN_SCYLLA_CONTAINER_NAME: z.string().min(1).default("scylladb"),
  SCYLLA_CONTACT_POINTS: z.string().min(1),
  SCYLLA_PORT: z.coerce.number().int().positive().max(65_535),
  SCYLLA_LOCAL_DATACENTER: z.string().min(1),
  SCYLLA_KEYSPACE: z.string().min(1),
  SCYLLA_USERNAME: z.string().min(1).optional(),
  SCYLLA_PASSWORD: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32),
});

export const serverEnv = envSchema.parse({
  ADMIN_BACKUP_DIR: process.env.ADMIN_BACKUP_DIR,
  ADMIN_CQL_REQUEST_TIMEOUT_SECONDS: process.env.ADMIN_CQL_REQUEST_TIMEOUT_SECONDS,
  ADMIN_SCYLLA_CONTAINER_NAME: process.env.ADMIN_SCYLLA_CONTAINER_NAME,
  SCYLLA_CONTACT_POINTS: process.env.SCYLLA_CONTACT_POINTS,
  SCYLLA_PORT: process.env.SCYLLA_PORT,
  SCYLLA_LOCAL_DATACENTER: process.env.SCYLLA_LOCAL_DATACENTER,
  SCYLLA_KEYSPACE: process.env.SCYLLA_KEYSPACE,
  SCYLLA_USERNAME: process.env.SCYLLA_USERNAME,
  SCYLLA_PASSWORD: process.env.SCYLLA_PASSWORD,
  AUTH_SECRET: process.env.AUTH_SECRET,
});
