import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type {
  InternalSchedule,
  OperationCustomerNotification,
  OperationCustomerNotificationRequest,
  OperationCustomerVisitStat,
  OperationDashboardResponse,
  OperationReport,
  OperationReportMutationRequest,
  OperationScheduleAdjustmentRequest,
  OperationTourEvent,
  OperationTourStatusMutationRequest,
  OperationTrendSnapshot,
  OperationTrendSnapshotMutationRequest,
} from "@/lib/shared/internal";

import { getRevenueDashboard } from "./revenue";
import { listSchedulesByTour, updateSchedule } from "./schedules";
import { dateToIso } from "./shared";
import { findInternalTour, listInternalTours } from "./tours";

type TourOperationEventRow = {
  changed_by: string;
  event_id: string;
  event_time: unknown;
  guest_count: number | null;
  note: string | null;
  status: OperationTourEvent["status"];
  tour_id: string;
  tour_title: string;
};

type CustomerVisitStatRow = {
  booking_count: number;
  calculated_at: Date | null;
  location_key: string;
  new_customer_count: number;
  period_type: OperationCustomerVisitStat["periodType"];
  period_value: string;
  vip_customer_count: number;
  visitor_count: number;
};

type TrendSnapshotRow = {
  analysis_type: OperationTrendSnapshot["analysisType"];
  created_by: string | null;
  data_uri: string | null;
  input_period: string;
  positive_trend: boolean;
  result_summary: string;
  snapshot_id: string;
  snapshot_time: unknown;
  title: string;
};

type OperationReportRow = {
  content: string;
  created_at: unknown;
  created_by: string;
  period_type: OperationReport["periodType"];
  period_value: string;
  report_id: string;
  source_data_uri: string | null;
  status: OperationReport["status"];
  title: string;
  updated_at: Date;
};

type OperationNotificationRow = {
  body: string;
  booking_id: string | null;
  delivery_status: string;
  notification_id: string;
  notification_time: unknown;
  title: string;
  tour_id: string;
  update_type: string;
  user_id: string | null;
};

function toTourEvent(row: TourOperationEventRow): OperationTourEvent {
  return {
    changedBy: String(row.changed_by),
    eventId: String(row.event_id),
    eventTime: String(row.event_time),
    guestCount: row.guest_count ?? null,
    note: row.note,
    status: row.status,
    tourId: String(row.tour_id),
    tourTitle: row.tour_title,
  };
}

function toVisitStat(row: CustomerVisitStatRow): OperationCustomerVisitStat {
  return {
    bookingCount: row.booking_count ?? 0,
    calculatedAt: dateToIso(row.calculated_at),
    locationKey: row.location_key,
    newCustomerCount: row.new_customer_count ?? 0,
    periodType: row.period_type,
    periodValue: row.period_value,
    vipCustomerCount: row.vip_customer_count ?? 0,
    visitorCount: row.visitor_count ?? 0,
  };
}

function toTrendSnapshot(row: TrendSnapshotRow): OperationTrendSnapshot {
  return {
    analysisType: row.analysis_type,
    createdBy: row.created_by ? String(row.created_by) : null,
    dataUri: row.data_uri,
    inputPeriod: row.input_period,
    positiveTrend: Boolean(row.positive_trend),
    resultSummary: row.result_summary,
    snapshotId: String(row.snapshot_id),
    snapshotTime: String(row.snapshot_time),
    title: row.title,
  };
}

function toReport(row: OperationReportRow): OperationReport {
  return {
    content: row.content,
    createdAt: String(row.created_at),
    createdBy: String(row.created_by),
    periodType: row.period_type,
    periodValue: row.period_value,
    reportId: String(row.report_id),
    sourceDataUri: row.source_data_uri,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at.toISOString(),
  };
}

function toNotification(row: OperationNotificationRow): OperationCustomerNotification {
  return {
    body: row.body,
    bookingId: row.booking_id ? String(row.booking_id) : null,
    deliveryStatus: row.delivery_status,
    notificationId: String(row.notification_id),
    notificationTime: String(row.notification_time),
    title: row.title,
    tourId: String(row.tour_id),
    updateType: row.update_type,
    userId: row.user_id ? String(row.user_id) : null,
  };
}

async function findLatestTourOperationEvent(tourId: string) {
  const rows = await executeQuery<TourOperationEventRow>(
    `SELECT tour_id, event_time, event_id, tour_title, status, guest_count, note, changed_by
     FROM tour_operation_events_by_tour
     WHERE tour_id = ?
     LIMIT 1`,
    [tourId],
  );

  return rows[0] ? toTourEvent(rows[0]) : null;
}

export async function listTourOperationEvents(tourId: string, limit = 20) {
  const rows = await executeQuery<TourOperationEventRow>(
    `SELECT tour_id, event_time, event_id, tour_title, status, guest_count, note, changed_by
     FROM tour_operation_events_by_tour
     WHERE tour_id = ?
     LIMIT ?`,
    [tourId, Math.min(Math.max(limit, 1), 80)],
  );

  return rows.map(toTourEvent);
}

export async function updateTourOperationStatus(input: {
  actorUserId: string;
  payload: OperationTourStatusMutationRequest;
  tourId: string;
}) {
  const tour = await findInternalTour(input.tourId);

  if (!tour) {
    return null;
  }

  const eventId = String(uuidv7());
  const eventTime = String(types.TimeUuid.now());

  await executeQuery(
    `INSERT INTO tour_operation_events_by_tour
      (tour_id, event_time, event_id, tour_title, status, guest_count, note, changed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.tourId,
      eventTime,
      eventId,
      tour.title,
      input.payload.status,
      input.payload.guestCount ?? null,
      input.payload.note ?? null,
      input.actorUserId,
    ],
  );

  return findLatestTourOperationEvent(input.tourId);
}

export async function adjustOperationSchedule(input: {
  payload: OperationScheduleAdjustmentRequest;
  scheduleId: string;
  tourId: string;
}) {
  const schedules = await listSchedulesByTour(input.tourId);
  const current = schedules.find((schedule) => schedule.scheduleId === input.scheduleId);

  if (!current) {
    return null;
  }

  const merged: InternalSchedule = {
    ...current,
    availableSlots: input.payload.availableSlots ?? current.availableSlots,
    bookedSlots: input.payload.bookedSlots ?? current.bookedSlots,
    currency: input.payload.currency ?? current.currency,
    departureDate: input.payload.departureDate,
    departureTime: input.payload.departureTime ?? current.departureTime,
    price: input.payload.price ?? current.price,
    status: input.payload.status ?? current.status,
  };

  return updateSchedule(input.tourId, input.scheduleId, merged);
}

export async function sendOperationCustomerNotification(input: {
  actorUserId: string;
  payload: OperationCustomerNotificationRequest;
  tourId: string;
}) {
  const notificationId = String(uuidv7());
  const notificationTime = String(types.TimeUuid.now());
  const deliveryStatus = "queued";

  await executeQuery(
    `INSERT INTO tour_update_notifications
      (tour_id, notification_time, notification_id, booking_id, user_id, update_type, title, body, delivery_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.tourId,
      notificationTime,
      notificationId,
      input.payload.bookingId ?? null,
      input.payload.userId ?? null,
      input.payload.updateType,
      input.payload.title,
      input.payload.body,
      deliveryStatus,
    ],
  );

  if (input.payload.bookingId) {
    await executeQuery(
      `INSERT INTO customer_notifications_by_booking
        (booking_id, notification_time, notification_id, tour_id, user_id, update_type, title, body, delivery_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.payload.bookingId,
        notificationTime,
        notificationId,
        input.tourId,
        input.payload.userId ?? null,
        input.payload.updateType,
        input.payload.title,
        input.payload.body,
        deliveryStatus,
        input.actorUserId,
      ],
    );
  }

  return {
    body: input.payload.body,
    bookingId: input.payload.bookingId ?? null,
    deliveryStatus,
    notificationId,
    notificationTime,
    title: input.payload.title,
    tourId: input.tourId,
    updateType: input.payload.updateType,
    userId: input.payload.userId ?? null,
  } satisfies OperationCustomerNotification;
}

export async function listOperationNotificationsByTour(tourId: string, limit = 20) {
  const rows = await executeQuery<OperationNotificationRow>(
    `SELECT tour_id, notification_time, notification_id, booking_id, user_id, update_type, title, body, delivery_status
     FROM tour_update_notifications
     WHERE tour_id = ?
     LIMIT ?`,
    [tourId, Math.min(Math.max(limit, 1), 80)],
  );

  return rows.map(toNotification);
}

export async function listOperationCustomerVisitStats(input: {
  limit?: number;
  periodType: OperationCustomerVisitStat["periodType"];
}) {
  const rows = await executeQuery<CustomerVisitStatRow>(
    `SELECT period_type, period_value, location_key, visitor_count, booking_count, new_customer_count, vip_customer_count, calculated_at
     FROM customer_visit_stats_by_period
     WHERE period_type = ?
     LIMIT ?`,
    [input.periodType, Math.min(Math.max(input.limit ?? 20, 1), 80)],
  );

  return rows.map(toVisitStat);
}

export async function listOperationTrendSnapshots(input: {
  analysisType: OperationTrendSnapshot["analysisType"];
  cursor?: string | null;
  limit?: number;
}) {
  const page = await executePagedQuery<TrendSnapshotRow>(
    `SELECT analysis_type, snapshot_time, snapshot_id, title, input_period, result_summary, positive_trend, data_uri, created_by
     FROM trend_analysis_snapshots
     WHERE analysis_type = ?`,
    [input.analysisType],
    {
      fetchSize: Math.min(Math.max(input.limit ?? 12, 1), 48),
      pageState: input.cursor ?? null,
    },
  );

  return {
    nextCursor: page.pageState ? String(page.pageState) : null,
    snapshots: page.rows.map(toTrendSnapshot),
  };
}

export async function createOperationTrendSnapshot(input: {
  actorUserId: string;
  payload: OperationTrendSnapshotMutationRequest;
}) {
  const snapshotId = String(uuidv7());
  const snapshotTime = String(types.TimeUuid.now());

  await executeQuery(
    `INSERT INTO trend_analysis_snapshots
      (analysis_type, snapshot_time, snapshot_id, title, input_period, result_summary, positive_trend, data_uri, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.payload.analysisType,
      snapshotTime,
      snapshotId,
      input.payload.title,
      input.payload.inputPeriod,
      input.payload.resultSummary,
      input.payload.positiveTrend,
      input.payload.dataUri ?? null,
      input.actorUserId,
    ],
  );

  return {
    analysisType: input.payload.analysisType,
    createdBy: input.actorUserId,
    dataUri: input.payload.dataUri ?? null,
    inputPeriod: input.payload.inputPeriod,
    positiveTrend: input.payload.positiveTrend,
    resultSummary: input.payload.resultSummary,
    snapshotId,
    snapshotTime,
    title: input.payload.title,
  } satisfies OperationTrendSnapshot;
}

export async function listOperationReports(input: {
  cursor?: string | null;
  limit?: number;
  periodType: OperationReport["periodType"];
  periodValue: string;
}) {
  const page = await executePagedQuery<OperationReportRow>(
    `SELECT period_type, period_value, created_at, report_id, created_by, title, content, status, source_data_uri, updated_at
     FROM operation_reports_by_period
     WHERE period_type = ? AND period_value = ?`,
    [input.periodType, input.periodValue],
    {
      fetchSize: Math.min(Math.max(input.limit ?? 12, 1), 48),
      pageState: input.cursor ?? null,
    },
  );

  return {
    nextCursor: page.pageState ? String(page.pageState) : null,
    reports: page.rows.map(toReport),
  };
}

export async function createOperationReport(input: {
  actorUserId: string;
  payload: OperationReportMutationRequest;
}) {
  const reportId = String(uuidv7());
  const createdAt = String(types.TimeUuid.now());
  const updatedAt = new Date();

  const params = [
    input.actorUserId,
    createdAt,
    reportId,
    input.payload.periodType,
    input.payload.periodValue,
    input.payload.title,
    input.payload.content,
    input.payload.status,
    input.payload.sourceDataUri ?? null,
    updatedAt,
  ];

  await Promise.all([
    executeQuery(
      `INSERT INTO operation_reports_by_staff
        (created_by, created_at, report_id, period_type, period_value, title, content, status, source_data_uri, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params,
    ),
    executeQuery(
      `INSERT INTO operation_reports_by_period
        (period_type, period_value, created_at, report_id, created_by, title, content, status, source_data_uri, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.payload.periodType,
        input.payload.periodValue,
        createdAt,
        reportId,
        input.actorUserId,
        input.payload.title,
        input.payload.content,
        input.payload.status,
        input.payload.sourceDataUri ?? null,
        updatedAt,
      ],
    ),
  ]);

  return {
    content: input.payload.content,
    createdAt,
    createdBy: input.actorUserId,
    periodType: input.payload.periodType,
    periodValue: input.payload.periodValue,
    reportId,
    sourceDataUri: input.payload.sourceDataUri ?? null,
    status: input.payload.status,
    title: input.payload.title,
    updatedAt: updatedAt.toISOString(),
  } satisfies OperationReport;
}

export async function getOperationsDashboard(input: {
  day: string;
  month: string;
  periodType: OperationCustomerVisitStat["periodType"];
}): Promise<OperationDashboardResponse> {
  const [revenue, tours, customerVisitStats, trendPage] = await Promise.all([
    getRevenueDashboard({ day: input.day, month: input.month }),
    listInternalTours(),
    listOperationCustomerVisitStats({ periodType: input.periodType, limit: 8 }),
    listOperationTrendSnapshots({ analysisType: "customer_trend", limit: 5 }),
  ]);
  const selectedTours = tours.slice(0, 12);
  const tourOverviews = await Promise.all(
    selectedTours.map(async (tour) => ({
      ...tour,
      lifecycleEvent: await findLatestTourOperationEvent(tour.tourId),
      schedules: await listSchedulesByTour(tour.tourId),
    })),
  );
  const recentEvents = (
    await Promise.all(selectedTours.map((tour) => listTourOperationEvents(tour.tourId, 3)))
  )
    .flat()
    .sort((left, right) => right.eventTime.localeCompare(left.eventTime))
    .slice(0, 12);

  return {
    bookingSummary: revenue.summary,
    customerVisitStats,
    recentEvents,
    revenue,
    tours: tourOverviews,
    trendSnapshots: trendPage.snapshots,
  };
}
