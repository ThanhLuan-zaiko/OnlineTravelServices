import "server-only";

import { z } from "zod";

const envSchema = z.object({
  SCYLLA_CONTACT_POINTS: z.string().min(1),
  SCYLLA_PORT: z.coerce.number().int().positive().max(65_535),
  SCYLLA_LOCAL_DATACENTER: z.string().min(1),
  SCYLLA_KEYSPACE: z.string().min(1),
  SCYLLA_USERNAME: z.string().min(1).optional(),
  SCYLLA_PASSWORD: z.string().min(1).optional(),
});

export const serverEnv = envSchema.parse({
  SCYLLA_CONTACT_POINTS: process.env.SCYLLA_CONTACT_POINTS,
  SCYLLA_PORT: process.env.SCYLLA_PORT,
  SCYLLA_LOCAL_DATACENTER: process.env.SCYLLA_LOCAL_DATACENTER,
  SCYLLA_KEYSPACE: process.env.SCYLLA_KEYSPACE,
  SCYLLA_USERNAME: process.env.SCYLLA_USERNAME,
  SCYLLA_PASSWORD: process.env.SCYLLA_PASSWORD,
});
