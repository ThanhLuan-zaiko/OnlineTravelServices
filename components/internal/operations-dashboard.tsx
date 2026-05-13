"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FiBarChart2, FiCalendar, FiTrendingUp, FiUsers } from "react-icons/fi";

import {
  adjustInternalOperationSchedule,
  createInternalOperationReport,
  createInternalOperationTrendSnapshot,
  getInternalOperationReports,
  getInternalOperationTourNotifications,
  getInternalOperationsDashboard,
  sendInternalOperationTourNotification,
  updateInternalOperationTourStatus,
} from "@/lib/client/api-client";
import type {
  OperationReportMutationRequest,
  OperationScheduleAdjustmentRequest,
  OperationTrendSnapshotMutationRequest,
} from "@/lib/shared/internal";

import { useToast } from "../ui/toast";
import { InternalPageHeader } from "./internal-primitives";
import { getDefaultTab, moduleCopy } from "./operations-dashboard/config";
import { OperationsDashboardFilters } from "./operations-dashboard/filters";
import { downloadReportsCsv, money, today } from "./operations-dashboard/formatters";
import { OperationsModuleNavigation, OperationsTabNavigation } from "./operations-dashboard/navigation";
import { NotificationSections } from "./operations-dashboard/notification-sections";
import { OperationsOverviewSection } from "./operations-dashboard/overview-section";
import { ReportSections } from "./operations-dashboard/report-sections";
import { ScheduleAdjustSection, ScheduleCalendarSection } from "./operations-dashboard/schedule-sections";
import { StatisticsSections } from "./operations-dashboard/statistics-sections";
import { TourEventsSection, TourStatusSection } from "./operations-dashboard/tour-sections";
import { TrendSections } from "./operations-dashboard/trend-sections";
import type {
  OperationNotificationForm,
  OperationSchedulePatch,
  OperationsModule,
  OperationsPeriodType,
  OperationsTab,
  TourStatus,
} from "./operations-dashboard/types";

export type { OperationsModule, OperationsTab } from "./operations-dashboard/types";

export function OperationsDashboard({
  basePath = "/internal/operations",
  module = "overview",
  tab,
}: {
  basePath?: string;
  module?: OperationsModule;
  tab?: OperationsTab;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [day, setDay] = useState(() => today());
  const [month, setMonth] = useState(() => today().slice(0, 7));
  const [periodType, setPeriodType] = useState<OperationsPeriodType>("month");
  const [selectedTourId, setSelectedTourId] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [tourStatus, setTourStatus] = useState<TourStatus>("preparing");
  const [guestCount, setGuestCount] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [schedulePatch, setSchedulePatch] = useState<OperationSchedulePatch>({
    availableSlots: "",
    bookedSlots: "",
    departureTime: "",
    price: "",
    status: "",
  });
  const [notificationForm, setNotificationForm] = useState<OperationNotificationForm>({
    body: "",
    bookingId: "",
    title: "",
    updateType: "schedule_update",
    userId: "",
  });
  const [trendForm, setTrendForm] = useState<OperationTrendSnapshotMutationRequest>({
    analysisType: "customer_trend",
    dataUri: null,
    inputPeriod: month,
    positiveTrend: true,
    resultSummary: "",
    title: "",
  });
  const [reportForm, setReportForm] = useState<OperationReportMutationRequest>({
    content: "",
    periodType: "month",
    periodValue: month,
    sourceDataUri: null,
    status: "draft",
    title: "",
  });

  const dashboardQuery = useQuery({
    queryKey: ["internal", "operations", day, month, periodType] as const,
    queryFn: () => getInternalOperationsDashboard({ day, month, periodType }),
  });
  const operations = dashboardQuery.data?.operations;
  const tours = useMemo(() => operations?.tours ?? [], [operations?.tours]);
  const selectedTour = useMemo(
    () => tours.find((tour) => tour.tourId === selectedTourId) ?? tours[0] ?? null,
    [selectedTourId, tours],
  );
  const selectedSchedule = useMemo(
    () =>
      selectedTour?.schedules.find((schedule) => schedule.scheduleId === selectedScheduleId) ??
      selectedTour?.schedules[0] ??
      null,
    [selectedScheduleId, selectedTour],
  );

  const notificationsQuery = useQuery({
    enabled: Boolean(selectedTour?.tourId),
    queryKey: ["internal", "operations", selectedTour?.tourId, "notifications"] as const,
    queryFn: () => getInternalOperationTourNotifications(selectedTour?.tourId ?? ""),
  });
  const reportsQuery = useQuery({
    queryKey: ["internal", "operations", "reports", reportForm.periodType, reportForm.periodValue] as const,
    queryFn: () => getInternalOperationReports({ periodType: reportForm.periodType, periodValue: reportForm.periodValue }),
  });

  const invalidateOperations = async () => {
    await queryClient.invalidateQueries({ queryKey: ["internal", "operations"] });
  };

  const statusMutation = useMutation({
    mutationFn: () => {
      if (!selectedTour) {
        throw new Error("Chưa chọn tour.");
      }

      return updateInternalOperationTourStatus(selectedTour.tourId, {
        guestCount: guestCount ? Number(guestCount) : undefined,
        note: statusNote || null,
        status: tourStatus,
      });
    },
    onSuccess: async () => {
      await invalidateOperations();
      setStatusNote("");
      showToast({ message: "Trạng thái vận hành đã được ghi nhận.", title: "Đã cập nhật", variant: "success" });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: () => {
      if (!selectedTour || !selectedSchedule) {
        throw new Error("Chưa chọn lịch khởi hành.");
      }

      const payload: OperationScheduleAdjustmentRequest = {
        departureDate: selectedSchedule.departureDate,
        availableSlots: schedulePatch.availableSlots ? Number(schedulePatch.availableSlots) : undefined,
        bookedSlots: schedulePatch.bookedSlots ? Number(schedulePatch.bookedSlots) : undefined,
        departureTime: schedulePatch.departureTime || undefined,
        price: schedulePatch.price || undefined,
        status: schedulePatch.status || undefined,
      };

      return adjustInternalOperationSchedule(selectedTour.tourId, selectedSchedule.scheduleId, payload);
    },
    onSuccess: async () => {
      await invalidateOperations();
      setSchedulePatch({ availableSlots: "", bookedSlots: "", departureTime: "", price: "", status: "" });
      showToast({ message: "Lịch khởi hành đã được điều chỉnh.", title: "Đã lưu", variant: "success" });
    },
  });

  const notificationMutation = useMutation({
    mutationFn: () => {
      if (!selectedTour) {
        throw new Error("Chưa chọn tour.");
      }

      return sendInternalOperationTourNotification(selectedTour.tourId, {
        body: notificationForm.body,
        bookingId: notificationForm.bookingId || null,
        title: notificationForm.title,
        updateType: notificationForm.updateType,
        userId: notificationForm.userId || null,
      });
    },
    onSuccess: async () => {
      await invalidateOperations();
      await queryClient.invalidateQueries({ queryKey: ["internal", "operations", selectedTour?.tourId, "notifications"] });
      setNotificationForm((current) => ({ ...current, body: "", bookingId: "", title: "", userId: "" }));
      showToast({ message: "Thông báo cập nhật đã được đưa vào hàng đợi.", title: "Đã gửi", variant: "success" });
    },
  });

  const trendMutation = useMutation({
    mutationFn: () => createInternalOperationTrendSnapshot(trendForm),
    onSuccess: async () => {
      await invalidateOperations();
      setTrendForm((current) => ({ ...current, resultSummary: "", title: "" }));
      showToast({ message: "Phân tích xu hướng đã được lưu.", title: "Đã lưu", variant: "success" });
    },
  });

  const reportMutation = useMutation({
    mutationFn: () => createInternalOperationReport(reportForm),
    onSuccess: async () => {
      await invalidateOperations();
      await queryClient.invalidateQueries({ queryKey: ["internal", "operations", "reports"] });
      setReportForm((current) => ({ ...current, content: "", title: "" }));
      showToast({ message: "Báo cáo vận hành đã được tạo.", title: "Đã lưu", variant: "success" });
    },
  });

  const handleMonthChange = (value: string) => {
    setMonth(value);
    setTrendForm((current) => ({ ...current, inputPeriod: value }));
  };

  const handleTourChange = (tourId: string) => {
    setSelectedTourId(tourId);
    setSelectedScheduleId("");
  };

  const cards = [
    { icon: FiBarChart2, label: "Doanh thu tháng", value: money(operations?.revenue.summary.totalRevenue ?? "0") },
    { icon: FiUsers, label: "Khách đã đặt", value: operations?.bookingSummary.bookingCount ?? 0 },
    { icon: FiCalendar, label: "Tour theo dõi", value: tours.length },
    { icon: FiTrendingUp, label: "Phân tích mới", value: operations?.trendSnapshots.length ?? 0 },
  ];
  const currentCopy = moduleCopy[module];
  const activeTab = tab ?? getDefaultTab(module);
  const showOverview = module === "overview";
  const showTourStatus = module === "tours" && activeTab === "status";
  const showTourEvents = module === "tours" && activeTab === "events";
  const showScheduleAdjust = module === "schedules" && activeTab === "adjust";
  const showScheduleCalendar = module === "schedules" && activeTab === "calendar";
  const showNotificationCompose = module === "notifications" && activeTab === "compose";
  const showNotificationHistory = module === "notifications" && activeTab === "history";
  const showStatisticsVisits = module === "statistics" && activeTab === "visits";
  const showStatisticsPerformance = module === "statistics" && activeTab === "performance";
  const showTrendAnalysis = module === "trends" && activeTab === "analysis";
  const showTrendSnapshots = module === "trends" && activeTab === "snapshots";
  const showReportEditor = module === "reports" && activeTab === "editor";
  const showReportList = module === "reports" && activeTab === "list";

  return (
    <div className="space-y-5">
      <InternalPageHeader description={currentCopy.description} title={currentCopy.title} />

      <OperationsModuleNavigation activeModule={module} basePath={basePath} />
      <OperationsTabNavigation activeModule={module} activeTab={activeTab} basePath={basePath} />

      <OperationsDashboardFilters
        day={day}
        month={month}
        onDayChange={setDay}
        onMonthChange={handleMonthChange}
        onPeriodTypeChange={setPeriodType}
        onRefresh={() => {
          void dashboardQuery.refetch();
        }}
        periodType={periodType}
      />

      {showOverview ? <OperationsOverviewSection cards={cards} /> : null}

      {showTourStatus || showTourEvents || showScheduleAdjust || showScheduleCalendar ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          {showTourStatus ? (
            <TourStatusSection
              guestCount={guestCount}
              isPending={statusMutation.isPending}
              onSubmit={() => statusMutation.mutate()}
              onTourChange={handleTourChange}
              selectedTour={selectedTour}
              setGuestCount={setGuestCount}
              setStatusNote={setStatusNote}
              setTourStatus={setTourStatus}
              statusNote={statusNote}
              tourStatus={tourStatus}
              tours={tours}
            />
          ) : null}

          {showTourEvents ? (
            <TourEventsSection events={operations?.recentEvents ?? []} isLoading={dashboardQuery.isLoading} />
          ) : null}

          {showScheduleAdjust ? (
            <ScheduleAdjustSection
              isLoading={dashboardQuery.isLoading}
              isPending={scheduleMutation.isPending}
              onSubmit={() => scheduleMutation.mutate()}
              schedulePatch={schedulePatch}
              selectedSchedule={selectedSchedule}
              selectedTour={selectedTour}
              setSchedulePatch={setSchedulePatch}
              setSelectedScheduleId={setSelectedScheduleId}
            />
          ) : null}

          {showScheduleCalendar ? (
            <ScheduleCalendarSection
              isLoading={dashboardQuery.isLoading}
              onTourChange={handleTourChange}
              selectedTour={selectedTour}
              tours={tours}
            />
          ) : null}
        </div>
      ) : null}

      {showNotificationCompose || showNotificationHistory ? (
        <NotificationSections
          form={notificationForm}
          isHistoryLoading={notificationsQuery.isLoading}
          isPending={notificationMutation.isPending}
          notifications={notificationsQuery.data?.notifications ?? []}
          onSubmit={() => notificationMutation.mutate()}
          selectedTour={selectedTour}
          setForm={setNotificationForm}
          showCompose={showNotificationCompose}
          showHistory={showNotificationHistory}
        />
      ) : null}

      {showStatisticsVisits || showStatisticsPerformance ? (
        <StatisticsSections
          operations={operations}
          showPerformance={showStatisticsPerformance}
          showVisits={showStatisticsVisits}
        />
      ) : null}

      {showTrendAnalysis || showTrendSnapshots ? (
        <TrendSections
          form={trendForm}
          isPending={trendMutation.isPending}
          onSubmit={() => trendMutation.mutate()}
          operations={operations}
          setForm={setTrendForm}
          showAnalysis={showTrendAnalysis}
          showSnapshots={showTrendSnapshots}
        />
      ) : null}

      {showReportEditor || showReportList ? (
        <ReportSections
          form={reportForm}
          isListLoading={reportsQuery.isLoading}
          isPending={reportMutation.isPending}
          onDownload={() => downloadReportsCsv(reportsQuery.data?.reports ?? [])}
          onSubmit={() => reportMutation.mutate()}
          reports={reportsQuery.data?.reports ?? []}
          setForm={setReportForm}
          showEditor={showReportEditor}
          showList={showReportList}
        />
      ) : null}
    </div>
  );
}
