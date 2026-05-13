import type { Dispatch, SetStateAction } from "react";
import type { IconType } from "react-icons";

import type {
  OperationDashboardResponse,
  OperationReportMutationRequest,
  OperationScheduleAdjustmentRequest,
  OperationTourOverview,
  OperationTourStatusMutationRequest,
  OperationTrendSnapshotMutationRequest,
} from "@/lib/shared/internal";

export type OperationsModule =
  | "notifications"
  | "overview"
  | "reports"
  | "schedules"
  | "statistics"
  | "tours"
  | "trends";

export type OperationsTab =
  | "adjust"
  | "analysis"
  | "calendar"
  | "compose"
  | "dashboard"
  | "editor"
  | "events"
  | "history"
  | "list"
  | "performance"
  | "snapshots"
  | "status"
  | "visits";

export type OperationsNavItem<TKey extends string> = {
  description: string;
  href: string;
  icon: IconType;
  key: TKey;
  label: string;
};

export type OperationsModuleCopy = {
  description: string;
  title: string;
};

export type OperationsPeriodType = OperationReportMutationRequest["periodType"];

export type OperationSchedulePatch = {
  availableSlots: string;
  bookedSlots: string;
  departureTime: string;
  price: string;
  status: "" | OperationScheduleAdjustmentRequest["status"];
};

export type OperationNotificationForm = {
  body: string;
  bookingId: string;
  title: string;
  updateType: string;
  userId: string;
};

export type OperationsSummaryCard = {
  icon: IconType;
  label: string;
  value: number | string;
};

export type OperationTour = OperationTourOverview;
export type OperationSchedule = OperationTourOverview["schedules"][number];
export type OperationsDashboardData = OperationDashboardResponse | undefined;
export type SetState<T> = Dispatch<SetStateAction<T>>;
export type TourStatus = OperationTourStatusMutationRequest["status"];
export type TrendForm = OperationTrendSnapshotMutationRequest;
export type ReportForm = OperationReportMutationRequest;
