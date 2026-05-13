import { hash, type Options as Argon2Options } from "@node-rs/argon2";
import { Client, auth } from "cassandra-driver";
import { uuidv7 } from "uuidv7";
import { z } from "zod";

const ADMIN_SUPER_STAFF_ROLE = "administrative_staff";
const ACTIVE_STATUS = "active";
const ADMINISTRATIVE_STAFF_PERMISSIONS = [
  "audit:read",
  "customer:manage",
  "notification:read",
  "suggested_tour:manage",
  "tour_approval:manage",
  "tour:manage",
  "schedule:manage",
  "promotion:manage",
  "revenue:read",
];
const OPERATIONS_STATISTICS_STAFF_PERMISSIONS = [
  "operations:access",
  "tour:read",
  "tour:update_status",
  "tour_info:update",
  "schedule:manage",
  "customer_stats:read",
  "customer_trend:analyze",
  "destination_stats:read",
  "revenue:read",
  "report:manage",
  "notification:manage",
  "notification:read",
  "audit:read",
];
const ADMIN_SUPER_ONLY_PERMISSIONS = [
  "staff:manage",
  "system:manage",
];
const ADMIN_SUPER_STAFF_PERMISSIONS = Array.from(
  new Set([
    ...ADMINISTRATIVE_STAFF_PERMISSIONS,
    ...OPERATIONS_STATISTICS_STAFF_PERMISSIONS,
    ...ADMIN_SUPER_ONLY_PERMISSIONS,
  ]),
).sort();

const passwordHashOptions = {
  algorithm: 2,
  memoryCost: 19_456,
  outputLen: 32,
  parallelism: 1,
  timeCost: 2,
} satisfies Argon2Options;

const envSchema = z.object({
  ADMIN_SUPER_STAFF_EMAIL: z.string().trim().email().toLowerCase(),
  ADMIN_SUPER_STAFF_FULL_NAME: z.string().trim().min(2),
  ADMIN_SUPER_STAFF_PASSWORD: z.string().min(12),
  ADMIN_SUPER_STAFF_PHONE: z.string().trim().min(8),
  SCYLLA_CONTACT_POINTS: z.string().min(1),
  SCYLLA_KEYSPACE: z.string().min(1),
  SCYLLA_LOCAL_DATACENTER: z.string().min(1),
  SCYLLA_PASSWORD: z.string().min(1).optional(),
  SCYLLA_PORT: z.coerce.number().int().positive().max(65_535),
  SCYLLA_USERNAME: z.string().min(1).optional(),
});

function parseContactPoints(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function createClient(env: z.infer<typeof envSchema>) {
  const authProvider =
    env.SCYLLA_USERNAME || env.SCYLLA_PASSWORD
      ? new auth.PlainTextAuthProvider(env.SCYLLA_USERNAME ?? "", env.SCYLLA_PASSWORD ?? "")
      : undefined;

  return new Client({
    authProvider,
    contactPoints: parseContactPoints(env.SCYLLA_CONTACT_POINTS),
    keyspace: env.SCYLLA_KEYSPACE,
    localDataCenter: env.SCYLLA_LOCAL_DATACENTER,
    protocolOptions: {
      port: env.SCYLLA_PORT,
    },
    queryOptions: {
      prepare: true,
    },
  });
}

async function main() {
  const env = envSchema.parse(process.env);
  const client = createClient(env);
  const now = new Date();
  const userId = uuidv7();
  const staffId = uuidv7();
  const passwordHash = await hash(env.ADMIN_SUPER_STAFF_PASSWORD, passwordHashOptions);

  await client.connect();

  try {
    const existingEmail = await client.execute(
      "SELECT user_id, role FROM users_by_email WHERE email = ?",
      [env.ADMIN_SUPER_STAFF_EMAIL],
      { prepare: true },
    );

    if (existingEmail.rowLength > 0) {
      const existing = existingEmail.first();

      if (existing?.role !== ADMIN_SUPER_STAFF_ROLE) {
        throw new Error(
          `Email ${env.ADMIN_SUPER_STAFF_EMAIL} already belongs to role '${existing?.role}'.`,
        );
      }

      const existingUserId = String(existing.user_id);
      const staffRows = await client.execute(
        "SELECT staff_id, user_id FROM staff_by_role WHERE role = ? AND status = ?",
        [ADMIN_SUPER_STAFF_ROLE, ACTIVE_STATUS],
        { prepare: true },
      );
      const existingStaffRow = staffRows.rows.find((row) => String(row.user_id) === existingUserId);
      const existingStaffId = existingStaffRow?.staff_id ? String(existingStaffRow.staff_id) : uuidv7();

      await Promise.all([
        client.execute(
          `INSERT INTO staff_by_id
            (staff_id, user_id, email, full_name, role, department, status, staff_level, hired_at, last_activity_at, permissions)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            existingStaffId,
            existingUserId,
            env.ADMIN_SUPER_STAFF_EMAIL,
            env.ADMIN_SUPER_STAFF_FULL_NAME,
            ADMIN_SUPER_STAFF_ROLE,
            "Super Administration",
            ACTIVE_STATUS,
            "super_admin",
            now,
            null,
            ADMIN_SUPER_STAFF_PERMISSIONS,
          ],
          { prepare: true },
        ),
        client.execute(
          `INSERT INTO staff_by_role
            (role, status, staff_id, user_id, email, full_name, department, last_activity_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ADMIN_SUPER_STAFF_ROLE,
            ACTIVE_STATUS,
            existingStaffId,
            existingUserId,
            env.ADMIN_SUPER_STAFF_EMAIL,
            env.ADMIN_SUPER_STAFF_FULL_NAME,
            "Super Administration",
            null,
          ],
          { prepare: true },
        ),
      ]);

      console.log(`Admin super staff already exists, staff rows verified: ${env.ADMIN_SUPER_STAFF_EMAIL}`);
      return;
    }

    const existingPhone = await client.execute(
      "SELECT user_id FROM users_by_phone WHERE phone = ?",
      [env.ADMIN_SUPER_STAFF_PHONE],
      { prepare: true },
    );

    if (existingPhone.rowLength > 0) {
      throw new Error(`Phone ${env.ADMIN_SUPER_STAFF_PHONE} is already used by another account.`);
    }

    await client.execute(
      `INSERT INTO users_by_id
        (user_id, email, phone, password_hash, full_name, role, status, customer_tier, vip_tier,
         created_at, updated_at, last_login_at, failed_login_count, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        env.ADMIN_SUPER_STAFF_EMAIL,
        env.ADMIN_SUPER_STAFF_PHONE,
        passwordHash,
        env.ADMIN_SUPER_STAFF_FULL_NAME,
        ADMIN_SUPER_STAFF_ROLE,
        ACTIVE_STATUS,
        null,
        null,
        now,
        now,
        null,
        0,
        {
          seed: "admin_super_env",
        },
      ],
      { prepare: true },
    );

    await Promise.all([
      client.execute(
        `INSERT INTO users_by_email
          (email, user_id, password_hash, full_name, role, status, customer_tier, vip_tier, created_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          env.ADMIN_SUPER_STAFF_EMAIL,
          userId,
          passwordHash,
          env.ADMIN_SUPER_STAFF_FULL_NAME,
          ADMIN_SUPER_STAFF_ROLE,
          ACTIVE_STATUS,
          null,
          null,
          now,
          null,
        ],
        { prepare: true },
      ),
      client.execute(
        `INSERT INTO users_by_phone
          (phone, user_id, email, full_name, role, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          env.ADMIN_SUPER_STAFF_PHONE,
          userId,
          env.ADMIN_SUPER_STAFF_EMAIL,
          env.ADMIN_SUPER_STAFF_FULL_NAME,
          ADMIN_SUPER_STAFF_ROLE,
          ACTIVE_STATUS,
          now,
        ],
        { prepare: true },
      ),
      client.execute(
        `INSERT INTO users_by_role
          (role, status, created_at, user_id, email, full_name, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          ADMIN_SUPER_STAFF_ROLE,
          ACTIVE_STATUS,
          now,
          userId,
          env.ADMIN_SUPER_STAFF_EMAIL,
          env.ADMIN_SUPER_STAFF_FULL_NAME,
          env.ADMIN_SUPER_STAFF_PHONE,
        ],
        { prepare: true },
      ),
      client.execute(
        `INSERT INTO staff_by_id
          (staff_id, user_id, email, full_name, role, department, status, staff_level, hired_at, last_activity_at, permissions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          staffId,
          userId,
          env.ADMIN_SUPER_STAFF_EMAIL,
          env.ADMIN_SUPER_STAFF_FULL_NAME,
          ADMIN_SUPER_STAFF_ROLE,
          "Super Administration",
          ACTIVE_STATUS,
          "super_admin",
          now,
          null,
          ADMIN_SUPER_STAFF_PERMISSIONS,
        ],
        { prepare: true },
      ),
      client.execute(
        `INSERT INTO staff_by_role
          (role, status, staff_id, user_id, email, full_name, department, last_activity_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ADMIN_SUPER_STAFF_ROLE,
          ACTIVE_STATUS,
          staffId,
          userId,
          env.ADMIN_SUPER_STAFF_EMAIL,
          env.ADMIN_SUPER_STAFF_FULL_NAME,
          "Super Administration",
          null,
        ],
        { prepare: true },
      ),
    ]);

    console.log(`Created admin super staff: ${env.ADMIN_SUPER_STAFF_EMAIL}`);
  } finally {
    await client.shutdown();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
