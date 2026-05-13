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

import { apiClient } from "./core";

export async function getInternalOperationsDashboard(input?: {
  day?: string;
  month?: string;
  periodType?: "day" | "week" | "month" | "year";
}) {
  const response = await apiClient.get<{ operations: OperationDashboardResponse }>("/internal/operations", {
    params: input,
  });

  return response.data;
}

export async function updateInternalOperationTourStatus(tourId: string, input: OperationTourStatusMutationRequest) {
  const response = await apiClient.patch<{ event: OperationTourEvent }>(
    `/internal/operations/tours/${tourId}/status`,
    input,
  );

  return response.data;
}

export async function getInternalOperationTourEvents(tourId: string) {
  const response = await apiClient.get<{ events: OperationTourEvent[] }>(
    `/internal/operations/tours/${tourId}/events`,
  );

  return response.data;
}

export async function adjustInternalOperationSchedule(
  tourId: string,
  scheduleId: string,
  input: OperationScheduleAdjustmentRequest,
) {
  const response = await apiClient.patch<{ schedule: InternalSchedule }>(
    `/internal/operations/tours/${tourId}/schedules/${scheduleId}/adjust`,
    input,
  );

  return response.data;
}

export async function getInternalOperationTourNotifications(tourId: string) {
  const response = await apiClient.get<{ notifications: OperationCustomerNotification[] }>(
    `/internal/operations/tours/${tourId}/notifications`,
  );

  return response.data;
}

export async function sendInternalOperationTourNotification(
  tourId: string,
  input: OperationCustomerNotificationRequest,
) {
  const response = await apiClient.post<{ notification: OperationCustomerNotification }>(
    `/internal/operations/tours/${tourId}/notifications`,
    input,
  );

  return response.data;
}

export async function getInternalOperationCustomerVisitStats(input?: {
  limit?: number;
  periodType?: "day" | "week" | "month" | "year";
}) {
  const response = await apiClient.get<{ stats: OperationCustomerVisitStat[] }>(
    "/internal/operations/stats/customer-visits",
    {
      params: input,
    },
  );

  return response.data;
}

export async function getInternalOperationTrendSnapshots(input?: {
  analysisType?: OperationTrendSnapshot["analysisType"];
  cursor?: string | null;
}) {
  const response = await apiClient.get<{ nextCursor: string | null; snapshots: OperationTrendSnapshot[] }>(
    "/internal/operations/trends",
    {
      params: input,
    },
  );

  return response.data;
}

export async function createInternalOperationTrendSnapshot(input: OperationTrendSnapshotMutationRequest) {
  const response = await apiClient.post<{ snapshot: OperationTrendSnapshot }>("/internal/operations/trends", input);

  return response.data;
}

export async function getInternalOperationReports(input: {
  cursor?: string | null;
  periodType: OperationReport["periodType"];
  periodValue: string;
}) {
  const response = await apiClient.get<{ nextCursor: string | null; reports: OperationReport[] }>(
    "/internal/operations/reports",
    {
      params: input,
    },
  );

  return response.data;
}

export async function createInternalOperationReport(input: OperationReportMutationRequest) {
  const response = await apiClient.post<{ report: OperationReport }>("/internal/operations/reports", input);

  return response.data;
}
