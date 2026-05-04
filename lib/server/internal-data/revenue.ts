import "server-only";

import { types } from "cassandra-driver";

import { executeQuery } from "@/lib/server/scylla";
import type { InternalRevenueResponse } from "@/lib/shared/internal";

import { BOOKING_STATUSES, dateToIso, decimalToString } from "./shared";

export async function getRevenueDashboard(input: { day: string; month: string }): Promise<InternalRevenueResponse> {
  const statDay = types.LocalDate.fromString(input.day);
  const [dailyRows, monthlyRows, tourRows] = await Promise.all([
    executeQuery<{
      calculated_at: Date | null;
      currency: string;
      net_revenue: unknown;
      payment_count: number;
      refund_amount: unknown;
      total_revenue: unknown;
    }>(
      "SELECT currency, total_revenue, payment_count, refund_amount, net_revenue, calculated_at FROM revenue_stats_by_day WHERE stat_day = ?",
      [statDay],
    ),
    executeQuery<{
      calculated_at: Date | null;
      currency: string;
      net_revenue: unknown;
      payment_count: number;
      refund_amount: unknown;
      total_revenue: unknown;
    }>(
      "SELECT currency, total_revenue, payment_count, refund_amount, net_revenue, calculated_at FROM revenue_stats_by_month WHERE stat_month = ?",
      [input.month],
    ),
    executeQuery<{
      average_rating: unknown;
      booking_count: number;
      cancellation_count: number;
      guest_count: number;
      revenue: unknown;
      title: string;
      tour_id: string;
    }>(
      "SELECT revenue, tour_id, title, booking_count, guest_count, average_rating, cancellation_count FROM tour_performance_by_month WHERE stat_month = ? LIMIT 20",
      [input.month],
    ),
  ]);

  const bookingRows = await Promise.all(
    BOOKING_STATUSES.map(async (status) => {
      const rows = await executeQuery<{ booking_count: number; gross_amount: unknown }>(
        "SELECT booking_count, gross_amount FROM booking_stats_by_day WHERE stat_day = ? AND status = ?",
        [statDay, status],
      );

      return rows[0] ?? null;
    }),
  );
  const daily = dailyRows.map((row) => ({
    calculatedAt: dateToIso(row.calculated_at),
    currency: row.currency,
    netRevenue: decimalToString(row.net_revenue),
    paymentCount: row.payment_count,
    refundAmount: decimalToString(row.refund_amount),
    statDay: input.day,
    totalRevenue: decimalToString(row.total_revenue),
  }));
  const monthly = monthlyRows.map((row) => ({
    calculatedAt: dateToIso(row.calculated_at),
    currency: row.currency,
    netRevenue: decimalToString(row.net_revenue),
    paymentCount: row.payment_count,
    refundAmount: decimalToString(row.refund_amount),
    statMonth: input.month,
    totalRevenue: decimalToString(row.total_revenue),
  }));

  return {
    daily,
    monthly,
    summary: {
      bookingCount: bookingRows.reduce((sum, row) => sum + (row?.booking_count ?? 0), 0),
      grossAmount: bookingRows.reduce((sum, row) => sum + Number(decimalToString(row?.gross_amount)), 0).toFixed(2),
      netRevenue: monthly.reduce((sum, row) => sum + Number(row.netRevenue), 0).toFixed(2),
      paymentCount: monthly.reduce((sum, row) => sum + row.paymentCount, 0),
      refundAmount: monthly.reduce((sum, row) => sum + Number(row.refundAmount), 0).toFixed(2),
      totalRevenue: monthly.reduce((sum, row) => sum + Number(row.totalRevenue), 0).toFixed(2),
    },
    tourPerformance: tourRows.map((row) => ({
      averageRating: decimalToString(row.average_rating),
      bookingCount: row.booking_count,
      cancellationCount: row.cancellation_count,
      guestCount: row.guest_count,
      revenue: decimalToString(row.revenue),
      statMonth: input.month,
      title: row.title,
      tourId: String(row.tour_id),
    })),
  };
}
