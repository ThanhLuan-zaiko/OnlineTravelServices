import "server-only";

import { types } from "cassandra-driver";

import { ACTIVE_STATUS } from "@/lib/server/auth-constants";
import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type {
  CustomerRewardMutationRequest,
  CustomerTierMutationRequest,
  InternalCustomerHistory,
  InternalCustomerProfile,
  InternalCustomerReward,
} from "@/lib/shared/internal";

import { dateToIso, decimal, decimalToString } from "./shared";

type CustomerRow = {
  created_at: Date;
  customer_tier: string;
  email: string;
  full_name: string;
  last_booking_at: Date | null;
  loyalty_points: number | null;
  phone: string;
  status: string | null;
  total_bookings: number | null;
  total_spent: unknown;
  user_id: string;
  violation_count: number | null;
  vip_tier: string;
};

type CustomerHistoryRow = {
  amount: unknown | null;
  detail: string | null;
  entity_id: string | null;
  entity_type: string | null;
  event_time: unknown;
  event_type: string;
  title: string;
};

type CustomerRewardRow = {
  description: string | null;
  expires_at: Date | null;
  points_delta: number;
  promotion_id: string | null;
  redeemed_at: Date | null;
  reward_time: unknown;
  reward_type: string;
  title: string;
  user_id: string;
};

function toCustomer(row: CustomerRow): InternalCustomerProfile {
  return {
    createdAt: row.created_at.toISOString(),
    customerTier: row.customer_tier,
    email: row.email,
    fullName: row.full_name,
    lastBookingAt: dateToIso(row.last_booking_at),
    loyaltyPoints: row.loyalty_points ?? 0,
    phone: row.phone,
    status: row.status ?? ACTIVE_STATUS,
    totalBookings: row.total_bookings ?? 0,
    totalSpent: decimalToString(row.total_spent),
    userId: String(row.user_id),
    violationCount: row.violation_count ?? 0,
    vipTier: row.vip_tier,
  };
}

function toHistory(row: CustomerHistoryRow): InternalCustomerHistory {
  return {
    amount: row.amount == null ? null : decimalToString(row.amount),
    detail: row.detail,
    entityId: row.entity_id ? String(row.entity_id) : null,
    entityType: row.entity_type,
    eventTime: String(row.event_time),
    eventType: row.event_type,
    title: row.title,
  };
}

function rewardStatus(row: CustomerRewardRow): InternalCustomerReward["status"] {
  if (row.redeemed_at) return "redeemed";
  if (row.expires_at && row.expires_at.getTime() < Date.now()) return "expired";
  return "active";
}

function toReward(row: CustomerRewardRow): InternalCustomerReward {
  return {
    description: row.description,
    expiresAt: dateToIso(row.expires_at),
    pointsDelta: row.points_delta,
    promotionId: row.promotion_id ? String(row.promotion_id) : null,
    redeemedAt: dateToIso(row.redeemed_at),
    rewardTime: String(row.reward_time),
    rewardType: row.reward_type,
    status: rewardStatus(row),
    title: row.title,
    userId: String(row.user_id),
  };
}

async function writeCustomerProjections(customer: InternalCustomerProfile) {
  await Promise.all([
    executeQuery(
      `INSERT INTO customers_by_status
        (status, created_at, user_id, email, full_name, phone, customer_tier, vip_tier, loyalty_points, total_bookings, total_spent, violation_count, last_booking_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.status,
        new Date(customer.createdAt),
        customer.userId,
        customer.email,
        customer.fullName,
        customer.phone,
        customer.customerTier,
        customer.vipTier,
        customer.loyaltyPoints,
        customer.totalBookings,
        decimal(customer.totalSpent),
        customer.violationCount,
        customer.lastBookingAt ? new Date(customer.lastBookingAt) : null,
      ],
    ),
    executeQuery(
      `INSERT INTO customers_by_tier
        (customer_tier, loyalty_points, user_id, email, full_name, phone, status, vip_tier, total_bookings, total_spent, violation_count, last_booking_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.customerTier,
        customer.loyaltyPoints,
        customer.userId,
        customer.email,
        customer.fullName,
        customer.phone,
        customer.status,
        customer.vipTier,
        customer.totalBookings,
        decimal(customer.totalSpent),
        customer.violationCount,
        customer.lastBookingAt ? new Date(customer.lastBookingAt) : null,
        new Date(customer.createdAt),
      ],
    ),
    executeQuery(
      `INSERT INTO customers_by_vip_tier
        (vip_tier, loyalty_points, user_id, email, full_name, phone, status, customer_tier, total_bookings, total_spent, violation_count, last_booking_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.vipTier,
        customer.loyaltyPoints,
        customer.userId,
        customer.email,
        customer.fullName,
        customer.phone,
        customer.status,
        customer.customerTier,
        customer.totalBookings,
        decimal(customer.totalSpent),
        customer.violationCount,
        customer.lastBookingAt ? new Date(customer.lastBookingAt) : null,
        new Date(customer.createdAt),
      ],
    ),
  ]);
}

async function deleteCustomerProjections(customer: InternalCustomerProfile) {
  await Promise.all([
    executeQuery(
      "DELETE FROM customers_by_status WHERE status = ? AND created_at = ? AND user_id = ?",
      [customer.status, new Date(customer.createdAt), customer.userId],
    ),
    executeQuery(
      "DELETE FROM customers_by_tier WHERE customer_tier = ? AND loyalty_points = ? AND user_id = ?",
      [customer.customerTier, customer.loyaltyPoints, customer.userId],
    ),
    executeQuery(
      "DELETE FROM customers_by_vip_tier WHERE vip_tier = ? AND loyalty_points = ? AND user_id = ?",
      [customer.vipTier, customer.loyaltyPoints, customer.userId],
    ),
  ]);
}

async function writeCustomerHistory(input: {
  amount?: string | null;
  detail?: string | null;
  entityId?: string | null;
  entityType?: string | null;
  eventType: string;
  title: string;
  userId: string;
}) {
  await executeQuery(
    `INSERT INTO customer_history_by_user
      (user_id, event_time, event_type, entity_type, entity_id, title, detail, amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.userId,
      String(types.TimeUuid.now()),
      input.eventType,
      input.entityType ?? null,
      input.entityId ?? null,
      input.title,
      input.detail ?? null,
      input.amount ? decimal(input.amount) : null,
    ],
  );
}

export async function findInternalCustomer(userId: string) {
  const rows = await executeQuery<CustomerRow>(
    `SELECT user_id, email, full_name, phone, status, customer_tier, vip_tier, loyalty_points, total_bookings,
            total_spent, violation_count, last_booking_at, created_at
     FROM customers_by_id
     WHERE user_id = ?`,
    [userId],
  );

  return rows[0] ? toCustomer(rows[0]) : null;
}

export async function listInternalCustomers(options?: {
  cursor?: string | null;
  limit?: number;
  mode?: "all" | "status" | "tier" | "vip";
  query?: string;
  value?: string;
}) {
  const limit = Math.min(Math.max(options?.limit ?? 12, 1), 80);
  const mode = options?.mode ?? "status";
  const query = options?.query?.trim().toLowerCase();
  const fetchSize = query ? Math.min(limit * 3, 120) : limit;
  const params: unknown[] = [];
  let cql = "";

  if (mode === "tier") {
    cql = `SELECT user_id FROM customers_by_tier WHERE customer_tier = ?`;
    params.push(options?.value || "standard");
  } else if (mode === "vip") {
    cql = `SELECT user_id FROM customers_by_vip_tier WHERE vip_tier = ?`;
    params.push(options?.value || "none");
  } else {
    cql = `SELECT user_id FROM customers_by_status WHERE status = ?`;
    params.push(options?.value || ACTIVE_STATUS);
  }

  const page = await executePagedQuery<{ user_id: string }>(cql, params, {
    fetchSize,
    pageState: options?.cursor ?? null,
  });
  const customers = (await Promise.all(page.rows.map((row) => findInternalCustomer(String(row.user_id)))))
    .filter((customer): customer is InternalCustomerProfile => Boolean(customer))
    .filter((customer) => {
      if (!query) return true;
      return [customer.fullName, customer.email, customer.phone, customer.customerTier, customer.vipTier, customer.userId].some((value) =>
        value.toLowerCase().includes(query),
      );
    })
    .slice(0, limit);

  return {
    customers,
    nextCursor: page.pageState ? String(page.pageState) : null,
  };
}

export async function listCustomerHistory(userId: string, limit = 30) {
  const rows = await executeQuery<CustomerHistoryRow>(
    `SELECT event_time, event_type, entity_type, entity_id, title, detail, amount
     FROM customer_history_by_user
     WHERE user_id = ?
     LIMIT ?`,
    [userId, Math.min(Math.max(limit, 1), 80)],
  );

  return rows.map(toHistory);
}

export async function listCustomerRewards(userId: string, limit = 30) {
  const rows = await executeQuery<CustomerRewardRow>(
    `SELECT user_id, reward_time, reward_type, title, description, points_delta, promotion_id, expires_at, redeemed_at
     FROM customer_rewards
     WHERE user_id = ?
     LIMIT ?`,
    [userId, Math.min(Math.max(limit, 1), 80)],
  );

  return rows.map(toReward);
}

export async function updateCustomerTier(userId: string, input: CustomerTierMutationRequest) {
  const existing = await findInternalCustomer(userId);

  if (!existing) {
    return null;
  }

  const updated = {
    ...existing,
    customerTier: input.customerTier,
    vipTier: input.vipTier,
  };

  await deleteCustomerProjections(existing);
  await executeQuery(
    "UPDATE customers_by_id SET customer_tier = ?, vip_tier = ? WHERE user_id = ?",
    [input.customerTier, input.vipTier, userId],
  );
  await executeQuery(
    "UPDATE users_by_id SET customer_tier = ?, vip_tier = ?, updated_at = ? WHERE user_id = ?",
    [input.customerTier, input.vipTier, new Date(), userId],
  );
  await executeQuery(
    "UPDATE users_by_email SET customer_tier = ?, vip_tier = ? WHERE email = ?",
    [input.customerTier, input.vipTier, existing.email],
  );
  await writeCustomerProjections(updated);
  await writeCustomerHistory({
    detail: `Customer tier: ${existing.customerTier} -> ${input.customerTier}; VIP tier: ${existing.vipTier} -> ${input.vipTier}.`,
    eventType: "tier_updated",
    title: "Cập nhật phân loại khách hàng",
    userId,
  });

  return findInternalCustomer(userId);
}

export async function addCustomerReward(userId: string, input: CustomerRewardMutationRequest) {
  const customer = await findInternalCustomer(userId);

  if (!customer) {
    return null;
  }

  const rewardTime = String(types.TimeUuid.now());
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  const projectionExpiresAt = expiresAt ?? new Date("9999-12-31T00:00:00.000Z");

  await executeQuery(
    `INSERT INTO customer_rewards
      (user_id, reward_time, reward_type, title, description, points_delta, promotion_id, expires_at, redeemed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      rewardTime,
      input.rewardType,
      input.title,
      input.description ?? null,
      input.pointsDelta,
      input.promotionId ?? null,
      expiresAt,
      null,
    ],
  );
  await executeQuery(
    `INSERT INTO customer_rewards_by_status
      (status, expires_at, user_id, reward_time, reward_type, title, description, points_delta, promotion_id, redeemed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "active",
      projectionExpiresAt,
      userId,
      rewardTime,
      input.rewardType,
      input.title,
      input.description ?? null,
      input.pointsDelta,
      input.promotionId ?? null,
      null,
    ],
  );
  await writeCustomerHistory({
    amount: String(input.pointsDelta),
    detail: input.description,
    entityId: input.promotionId ?? null,
    entityType: input.promotionId ? "promotion" : null,
    eventType: "reward_assigned",
    title: input.title,
    userId,
  });

  const rewards = await listCustomerRewards(userId, 1);

  return rewards[0] ?? null;
}
