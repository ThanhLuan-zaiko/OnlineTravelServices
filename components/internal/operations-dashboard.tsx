"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  FiActivity,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiDownload,
  FiFileText,
  FiRefreshCw,
  FiSave,
  FiSend,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";

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
  OperationReport,
  OperationReportMutationRequest,
  OperationScheduleAdjustmentRequest,
  OperationTourStatusMutationRequest,
  OperationTrendSnapshotMutationRequest,
} from "@/lib/shared/internal";

import { useToast } from "../ui/toast";
import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

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

const operationModules: Array<{
  description: string;
  href: string;
  icon: typeof FiActivity;
  key: OperationsModule;
  label: string;
}> = [
  {
    description: "Tổng hợp trạng thái, doanh thu, booking và cảnh báo vận hành.",
    href: "/internal/operations",
    icon: FiBarChart2,
    key: "overview",
    label: "Tổng quan",
  },
  {
    description: "Chuẩn bị, diễn ra, hoàn thành, hủy lịch và ghi nhận số lượng khách.",
    href: "/internal/operations/tours",
    icon: FiActivity,
    key: "tours",
    label: "Trạng thái tour",
  },
  {
    description: "Đổi giờ khởi hành, đổi số khách, đóng/mở lịch và điều chỉnh giá tạm thời.",
    href: "/internal/operations/schedules",
    icon: FiCalendar,
    key: "schedules",
    label: "Lịch trình",
  },
  {
    description: "Gửi thông báo thay đổi tour/lịch theo tour, booking hoặc khách.",
    href: "/internal/operations/notifications",
    icon: FiBell,
    key: "notifications",
    label: "Thông báo khách",
  },
  {
    description: "Thống kê khách và địa điểm theo ngày, tuần, tháng, năm.",
    href: "/internal/operations/statistics",
    icon: FiUsers,
    key: "statistics",
    label: "Thống kê",
  },
  {
    description: "Phân tích xu hướng khách, hiệu quả địa điểm, dự đoán nhu cầu và khuyến mãi.",
    href: "/internal/operations/trends",
    icon: FiTrendingUp,
    key: "trends",
    label: "Xu hướng",
  },
  {
    description: "Lưu báo cáo, tổng quát kết quả và xuất CSV.",
    href: "/internal/operations/reports",
    icon: FiFileText,
    key: "reports",
    label: "Báo cáo",
  },
];

const operationModuleTabs: Record<
  OperationsModule,
  Array<{
    description: string;
    href: string;
    icon: typeof FiActivity;
    key: OperationsTab;
    label: string;
  }>
> = {
  notifications: [
    {
      description: "Soạn thông báo cập nhật tour, lịch trình hoặc yêu cầu khách.",
      href: "/internal/operations/notifications/compose",
      icon: FiSend,
      key: "compose",
      label: "Soạn gửi",
    },
    {
      description: "Theo dõi thông báo đã gửi hoặc đang chờ xử lý.",
      href: "/internal/operations/notifications/history",
      icon: FiBell,
      key: "history",
      label: "Lịch sử",
    },
  ],
  overview: [
    {
      description: "Tổng quan nhanh toàn bộ hoạt động vận hành.",
      href: "/internal/operations",
      icon: FiBarChart2,
      key: "dashboard",
      label: "Tổng quan",
    },
  ],
  reports: [
    {
      description: "Tạo báo cáo vận hành và lưu dữ liệu thống kê.",
      href: "/internal/operations/reports/editor",
      icon: FiSave,
      key: "editor",
      label: "Tạo báo cáo",
    },
    {
      description: "Xem báo cáo đã lưu và xuất CSV.",
      href: "/internal/operations/reports/list",
      icon: FiDownload,
      key: "list",
      label: "Danh sách",
    },
  ],
  schedules: [
    {
      description: "Đổi giờ khởi hành, số chỗ, trạng thái và giá tạm thời.",
      href: "/internal/operations/schedules/adjust",
      icon: FiSave,
      key: "adjust",
      label: "Điều chỉnh",
    },
    {
      description: "Xem nhanh các lịch khởi hành của tour đang chọn.",
      href: "/internal/operations/schedules/calendar",
      icon: FiCalendar,
      key: "calendar",
      label: "Lịch hiện tại",
    },
  ],
  statistics: [
    {
      description: "Khách ghé thăm, booking, khách mới và VIP theo địa điểm.",
      href: "/internal/operations/statistics/visits",
      icon: FiUsers,
      key: "visits",
      label: "Khách & địa điểm",
    },
    {
      description: "Doanh thu, booking, số khách và đánh giá theo tour.",
      href: "/internal/operations/statistics/performance",
      icon: FiBarChart2,
      key: "performance",
      label: "Hiệu suất tour",
    },
  ],
  tours: [
    {
      description: "Cập nhật chuẩn bị, diễn ra, hoàn thành, hủy lịch và số khách.",
      href: "/internal/operations/tours/status",
      icon: FiActivity,
      key: "status",
      label: "Cập nhật trạng thái",
    },
    {
      description: "Xem lịch sử trạng thái vận hành gần đây.",
      href: "/internal/operations/tours/events",
      icon: FiFileText,
      key: "events",
      label: "Lịch sử",
    },
  ],
  trends: [
    {
      description: "Ghi nhận phân tích xu hướng mới.",
      href: "/internal/operations/trends/analysis",
      icon: FiTrendingUp,
      key: "analysis",
      label: "Phân tích mới",
    },
    {
      description: "Xem các ảnh chụp xu hướng đã lưu.",
      href: "/internal/operations/trends/snapshots",
      icon: FiFileText,
      key: "snapshots",
      label: "Ảnh chụp",
    },
  ],
};

function getDefaultTab(module: OperationsModule): OperationsTab {
  return operationModuleTabs[module][0]?.key ?? "dashboard";
}

const moduleCopy: Record<OperationsModule, { description: string; title: string }> = {
  notifications: {
    description: "Gửi và theo dõi thông báo cập nhật tour/lịch trình cho khách.",
    title: "Thông báo khách hàng",
  },
  overview: {
    description: "Điều hướng các module vận hành và xem nhanh tình hình tour, booking, doanh thu, xu hướng.",
    title: "Vận hành và thống kê",
  },
  reports: {
    description: "Lưu dữ liệu thống kê, tổng quát kết quả, lập báo cáo và xuất CSV.",
    title: "Báo cáo thống kê",
  },
  schedules: {
    description: "Kiểm soát lịch trình, đổi giờ khởi hành, thay đổi số lượng khách và giá tạm thời.",
    title: "Kiểm soát lịch trình",
  },
  statistics: {
    description: "Thống kê khách và địa điểm theo thời gian thực, ngày, tuần, tháng, năm.",
    title: "Thống kê khách và địa điểm",
  },
  tours: {
    description: "Quản lý thông tin tour ở lớp vận hành: trạng thái chuẩn bị, diễn ra, hoàn thành, hủy lịch.",
    title: "Trạng thái vận hành tour",
  },
  trends: {
    description: "Phân tích xu hướng khách, hiệu quả địa điểm, dự đoán nhu cầu và tác động khuyến mãi.",
    title: "Phân tích xu hướng",
  },
};

const lifecycleLabels: Record<OperationTourStatusMutationRequest["status"], string> = {
  cancelled: "Hủy lịch",
  completed: "Hoàn thành",
  in_progress: "Đang diễn ra",
  preparing: "Chuẩn bị",
};

const analysisLabels: Record<OperationTrendSnapshotMutationRequest["analysisType"], string> = {
  customer_trend: "Xu hướng khách",
  demand_forecast: "Dự đoán nhu cầu",
  destination_effectiveness: "Hiệu quả địa điểm",
  promotion_sentiment: "Khuyến mãi",
};

function today() {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000;

  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10);
}

function money(value: string) {
  return `${Number(value).toLocaleString("vi-VN")} đ`;
}

function csvEscape(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);

  return `"${text.replace(/"/g, '""')}"`;
}

function downloadReportsCsv(reports: OperationReport[]) {
  const rows = [
    ["report_id", "title", "period_type", "period_value", "status", "created_at", "updated_at", "content"],
    ...reports.map((report) => [
      report.reportId,
      report.title,
      report.periodType,
      report.periodValue,
      report.status,
      report.createdAt,
      report.updatedAt,
      report.content,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = "operation-reports.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function OperationsDashboard({
  module = "overview",
  tab,
}: {
  module?: OperationsModule;
  tab?: OperationsTab;
}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [day, setDay] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [periodType, setPeriodType] = useState<"day" | "week" | "month" | "year">("month");
  const [selectedTourId, setSelectedTourId] = useState("");
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [tourStatus, setTourStatus] = useState<OperationTourStatusMutationRequest["status"]>("preparing");
  const [guestCount, setGuestCount] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [schedulePatch, setSchedulePatch] = useState({
    availableSlots: "",
    bookedSlots: "",
    departureTime: "",
    price: "",
    status: "",
  });
  const [notificationForm, setNotificationForm] = useState({
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
    () => selectedTour?.schedules.find((schedule) => schedule.scheduleId === selectedScheduleId) ?? selectedTour?.schedules[0] ?? null,
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
        status: schedulePatch.status ? (schedulePatch.status as OperationScheduleAdjustmentRequest["status"]) : undefined,
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

  const cards = [
    { icon: FiBarChart2, label: "Doanh thu tháng", value: money(operations?.revenue.summary.totalRevenue ?? "0") },
    { icon: FiUsers, label: "Khách đã đặt", value: operations?.bookingSummary.bookingCount ?? 0 },
    { icon: FiCalendar, label: "Tour theo dõi", value: tours.length },
    { icon: FiTrendingUp, label: "Phân tích mới", value: operations?.trendSnapshots.length ?? 0 },
  ];
  const currentCopy = moduleCopy[module];
  const activeTab = tab ?? getDefaultTab(module);
  const nestedTabs = operationModuleTabs[module];
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
      <InternalPageHeader
        description={currentCopy.description}
        title={currentCopy.title}
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {operationModules.map((item) => {
          const Icon = item.icon;
          const active = item.key === module;

          return (
            <Link
              className={`rounded-xl border p-4 transition hover:border-sky-300 hover:text-sky-800 dark:hover:border-sky-900 dark:hover:text-sky-200 ${
                active
                  ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100"
                  : "border-slate-200 bg-white text-slate-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-300"
              }`}
              href={item.href}
              key={item.key}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/20">
                <Icon size={17} />
              </span>
              <p className="mt-3 text-sm font-semibold">{item.label}</p>
              <p className="mt-1 line-clamp-2 text-xs text-current/70">{item.description}</p>
            </Link>
          );
        })}
      </div>

      {nestedTabs.length > 1 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {nestedTabs.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeTab;

            return (
              <Link
                className={`rounded-xl border p-4 transition hover:border-sky-300 hover:text-sky-800 dark:hover:border-sky-900 dark:hover:text-sky-200 ${
                  active
                    ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100"
                    : "border-slate-200 bg-white text-slate-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-300"
                }`}
                href={item.href}
                key={item.key}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/20">
                  <Icon size={17} />
                </span>
                <p className="mt-3 text-sm font-semibold">{item.label}</p>
                <p className="mt-1 line-clamp-2 text-xs text-current/70">{item.description}</p>
              </Link>
            );
          })}
        </div>
      ) : null}

      <InternalPanel className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Ngày</span>
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="date" value={day} onChange={(event) => setDay(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Tháng</span>
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="month" value={month} onChange={(event) => { setMonth(event.target.value); setTrendForm((current) => ({ ...current, inputPeriod: event.target.value })); }} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Kỳ thống kê</span>
            <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={periodType} onChange={(event) => setPeriodType(event.target.value as typeof periodType)}>
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
              <option value="year">Năm</option>
            </select>
          </label>
          <button className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200" onClick={() => dashboardQuery.refetch()} type="button">
            <FiRefreshCw size={16} />
            Làm mới
          </button>
        </div>
      </InternalPanel>

      {showOverview ? (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <InternalPanel className="p-4" key={card.label}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-sky-700 dark:border-neutral-800 dark:text-sky-300">
                <Icon size={18} />
              </span>
              <p className="mt-4 text-2xl font-semibold text-slate-950 dark:text-neutral-50">{card.value}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{card.label}</p>
            </InternalPanel>
          );
        })}
      </div>
      ) : null}

      {showTourStatus || showTourEvents || showScheduleAdjust || showScheduleCalendar ? (
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        {showTourStatus ? (
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiActivity size={18} />
            <h2 className="text-base font-semibold">Kiểm soát tour</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Tour</span>
              <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={selectedTour?.tourId ?? ""} onChange={(event) => { setSelectedTourId(event.target.value); setSelectedScheduleId(""); }}>
                {tours.map((tour) => (
                  <option key={tour.tourId} value={tour.tourId}>{tour.title}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Trạng thái</span>
              <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={tourStatus} onChange={(event) => setTourStatus(event.target.value as typeof tourStatus)}>
                {Object.entries(lifecycleLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Số khách ghi nhận</span>
              <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" min="0" type="number" value={guestCount} onChange={(event) => setGuestCount(event.target.value)} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Ghi chú</span>
              <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={statusNote} onChange={(event) => setStatusNote(event.target.value)} />
            </label>
          </div>
          <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={statusMutation.isPending || !selectedTour} onClick={() => statusMutation.mutate()} type="button">
            <FiSave size={16} />
            Cập nhật trạng thái
          </button>
        </InternalPanel>
        ) : null}

        {showTourEvents ? (
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiFileText size={18} />
            <h2 className="text-base font-semibold">Lịch sử trạng thái vận hành</h2>
          </div>
          <div className="mt-4 space-y-2">
            {(operations?.recentEvents ?? []).length > 0 ? (
              (operations?.recentEvents ?? []).map((event) => (
                <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-neutral-800" key={event.eventId}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{event.tourTitle}</p>
                    <span className="text-xs text-slate-500">{lifecycleLabels[event.status]}</span>
                  </div>
                  <p className="mt-1 text-slate-500 dark:text-neutral-400">{event.note ?? "Không có ghi chú"}</p>
                </div>
              ))
            ) : (
              <EmptyState message={dashboardQuery.isLoading ? "Đang tải lịch sử..." : "Chưa có sự kiện vận hành nào."} />
            )}
          </div>
        </InternalPanel>
        ) : null}

        {showScheduleAdjust ? (
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiCalendar size={18} />
            <h2 className="text-base font-semibold">Điều chỉnh lịch trình</h2>
          </div>
          {selectedTour && selectedTour.schedules.length > 0 ? (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-semibold">Lịch khởi hành</span>
                  <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={selectedSchedule?.scheduleId ?? ""} onChange={(event) => setSelectedScheduleId(event.target.value)}>
                    {selectedTour.schedules.map((schedule) => (
                      <option key={schedule.scheduleId} value={schedule.scheduleId}>{schedule.departureDate} - {schedule.departureTime}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Giờ mới</span>
                  <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder={selectedSchedule?.departureTime} value={schedulePatch.departureTime} onChange={(event) => setSchedulePatch((current) => ({ ...current, departureTime: event.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Trạng thái</span>
                  <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={schedulePatch.status} onChange={(event) => setSchedulePatch((current) => ({ ...current, status: event.target.value }))}>
                    <option value="">Giữ nguyên</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Còn chỗ</span>
                  <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" min="0" placeholder={String(selectedSchedule?.availableSlots ?? "")} type="number" value={schedulePatch.availableSlots} onChange={(event) => setSchedulePatch((current) => ({ ...current, availableSlots: event.target.value }))} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Đã đặt</span>
                  <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" min="0" placeholder={String(selectedSchedule?.bookedSlots ?? "")} type="number" value={schedulePatch.bookedSlots} onChange={(event) => setSchedulePatch((current) => ({ ...current, bookedSlots: event.target.value }))} />
                </label>
                <label className="space-y-2 sm:col-span-2">
                  <span className="text-sm font-semibold">Giá tạm thời</span>
                  <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder={selectedSchedule?.price} value={schedulePatch.price} onChange={(event) => setSchedulePatch((current) => ({ ...current, price: event.target.value }))} />
                </label>
              </div>
              <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={scheduleMutation.isPending} onClick={() => scheduleMutation.mutate()} type="button">
                <FiSave size={16} />
                Lưu điều chỉnh
              </button>
            </>
          ) : (
            <EmptyState message={dashboardQuery.isLoading ? "Đang tải lịch trình..." : "Tour này chưa có lịch khởi hành."} />
          )}
        </InternalPanel>
        ) : null}

        {showScheduleCalendar ? (
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiCalendar size={18} />
            <h2 className="text-base font-semibold">Lịch hiện tại</h2>
          </div>
          <label className="mt-4 block space-y-2">
            <span className="text-sm font-semibold">Tour</span>
            <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={selectedTour?.tourId ?? ""} onChange={(event) => { setSelectedTourId(event.target.value); setSelectedScheduleId(""); }}>
              {tours.map((tour) => (
                <option key={tour.tourId} value={tour.tourId}>{tour.title}</option>
              ))}
            </select>
          </label>
          <div className="mt-4 space-y-2">
            {selectedTour && selectedTour.schedules.length > 0 ? (
              selectedTour.schedules.map((schedule) => (
                <div className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-neutral-800 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center" key={schedule.scheduleId}>
                  <p className="font-semibold">{schedule.departureDate} - {schedule.departureTime}</p>
                  <StatusPill value={schedule.status} />
                  <span>{schedule.bookedSlots}/{schedule.bookedSlots + schedule.availableSlots} khách</span>
                  <span>{money(schedule.price)}</span>
                </div>
              ))
            ) : (
              <EmptyState message={dashboardQuery.isLoading ? "Đang tải lịch..." : "Tour này chưa có lịch khởi hành."} />
            )}
          </div>
        </InternalPanel>
        ) : null}
      </div>
      ) : null}

      {showNotificationCompose || showNotificationHistory ? (
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {showNotificationCompose ? (
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiBell size={18} />
            <h2 className="text-base font-semibold">Thông báo khách hàng</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Loại cập nhật</span>
              <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={notificationForm.updateType} onChange={(event) => setNotificationForm((current) => ({ ...current, updateType: event.target.value }))} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Booking ID</span>
              <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={notificationForm.bookingId} onChange={(event) => setNotificationForm((current) => ({ ...current, bookingId: event.target.value }))} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Tiêu đề</span>
              <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={notificationForm.title} onChange={(event) => setNotificationForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Nội dung</span>
              <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={notificationForm.body} onChange={(event) => setNotificationForm((current) => ({ ...current, body: event.target.value }))} />
            </label>
          </div>
          <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={notificationMutation.isPending || !selectedTour} onClick={() => notificationMutation.mutate()} type="button">
            <FiSend size={16} />
            Gửi cập nhật
          </button>
        </InternalPanel>
        ) : null}

        {showNotificationHistory ? (
        <InternalPanel className="p-4">
          <h2 className="text-base font-semibold">Lịch sử thông báo</h2>
          <div className="mt-4 space-y-2">
            {(notificationsQuery.data?.notifications ?? []).length > 0 ? (
              notificationsQuery.data?.notifications.map((notification) => (
                <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={notification.notificationId}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">{notification.title}</p>
                    <StatusPill value={notification.deliveryStatus} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{notification.body}</p>
                </div>
              ))
            ) : (
              <EmptyState message={notificationsQuery.isLoading ? "Đang tải thông báo..." : "Chưa có thông báo cập nhật cho tour này."} />
            )}
          </div>
        </InternalPanel>
        ) : null}
      </div>
      ) : null}

      {showStatisticsVisits || showStatisticsPerformance ? (
      <div className="grid gap-5 xl:grid-cols-2">
        {showStatisticsVisits ? (
        <InternalPanel className="p-4">
          <h2 className="text-base font-semibold">Thống kê khách và địa điểm</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500 dark:text-neutral-500">
                <tr>
                  <th className="px-3 py-3">Địa điểm</th>
                  <th className="px-3 py-3">Kỳ</th>
                  <th className="px-3 py-3">Khách ghé thăm</th>
                  <th className="px-3 py-3">Booking</th>
                  <th className="px-3 py-3">VIP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
                {(operations?.customerVisitStats ?? []).map((stat) => (
                  <tr key={`${stat.periodValue}-${stat.locationKey}`}>
                    <td className="px-3 py-3 font-semibold">{stat.locationKey}</td>
                    <td className="px-3 py-3">{stat.periodValue}</td>
                    <td className="px-3 py-3">{stat.visitorCount}</td>
                    <td className="px-3 py-3">{stat.bookingCount}</td>
                    <td className="px-3 py-3">{stat.vipCustomerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </InternalPanel>
        ) : null}

        {showStatisticsPerformance ? (
        <InternalPanel className="p-4">
          <h2 className="text-base font-semibold">Hiệu suất tour</h2>
          <div className="mt-4 space-y-2">
            {(operations?.revenue.tourPerformance ?? []).slice(0, 6).map((tour) => (
              <div className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-neutral-800 sm:grid-cols-[1fr_auto_auto] sm:items-center" key={tour.tourId}>
                <p className="font-semibold">{tour.title}</p>
                <span>{money(tour.revenue)}</span>
                <span className="text-slate-500">{tour.bookingCount} booking</span>
              </div>
            ))}
          </div>
        </InternalPanel>
        ) : null}
      </div>
      ) : null}

      {showTrendAnalysis || showTrendSnapshots ? (
      <div className="grid gap-5 xl:grid-cols-2">
        {showTrendAnalysis ? (
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiTrendingUp size={18} />
            <h2 className="text-base font-semibold">Phân tích xu hướng</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Loại phân tích</span>
              <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={trendForm.analysisType} onChange={(event) => setTrendForm((current) => ({ ...current, analysisType: event.target.value as typeof current.analysisType }))}>
                {Object.entries(analysisLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Kỳ dữ liệu</span>
              <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={trendForm.inputPeriod} onChange={(event) => setTrendForm((current) => ({ ...current, inputPeriod: event.target.value }))} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Tiêu đề</span>
              <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={trendForm.title} onChange={(event) => setTrendForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Kết quả</span>
              <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={trendForm.resultSummary} onChange={(event) => setTrendForm((current) => ({ ...current, resultSummary: event.target.value }))} />
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <input checked={trendForm.positiveTrend} className="h-4 w-4" type="checkbox" onChange={(event) => setTrendForm((current) => ({ ...current, positiveTrend: event.target.checked }))} />
              Xu hướng tích cực
            </label>
          </div>
          <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={trendMutation.isPending} onClick={() => trendMutation.mutate()} type="button">
            <FiSave size={16} />
            Lưu phân tích
          </button>
        </InternalPanel>
        ) : null}

        {showTrendSnapshots ? (
        <InternalPanel className="p-4">
          <h2 className="text-base font-semibold">Ảnh chụp xu hướng</h2>
          <div className="mt-4 space-y-2">
            {(operations?.trendSnapshots ?? []).map((snapshot) => (
              <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={snapshot.snapshotId}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold">{snapshot.title}</p>
                  <StatusPill value={snapshot.positiveTrend ? "positive" : "negative"} />
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{snapshot.resultSummary}</p>
              </div>
            ))}
          </div>
        </InternalPanel>
        ) : null}
      </div>
      ) : null}

      {showReportEditor || showReportList ? (
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {showReportEditor ? (
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiFileText size={18} />
            <h2 className="text-base font-semibold">Báo cáo</h2>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold">Kỳ</span>
              <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={reportForm.periodType} onChange={(event) => setReportForm((current) => ({ ...current, periodType: event.target.value as typeof current.periodType }))}>
                <option value="day">Ngày</option>
                <option value="week">Tuần</option>
                <option value="month">Tháng</option>
                <option value="year">Năm</option>
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Giá trị kỳ</span>
              <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={reportForm.periodValue} onChange={(event) => setReportForm((current) => ({ ...current, periodValue: event.target.value }))} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Tiêu đề</span>
              <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={reportForm.title} onChange={(event) => setReportForm((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="space-y-2 sm:col-span-2">
              <span className="text-sm font-semibold">Nội dung</span>
              <textarea className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={reportForm.content} onChange={(event) => setReportForm((current) => ({ ...current, content: event.target.value }))} />
            </label>
          </div>
          <button className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={reportMutation.isPending} onClick={() => reportMutation.mutate()} type="button">
            <FiSave size={16} />
            Lưu báo cáo
          </button>
        </InternalPanel>
        ) : null}

        {showReportList ? (
        <InternalPanel className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Báo cáo đã lưu</h2>
            <button className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold dark:border-neutral-800" onClick={() => downloadReportsCsv(reportsQuery.data?.reports ?? [])} type="button">
              <FiDownload size={16} />
              CSV
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {(reportsQuery.data?.reports ?? []).length > 0 ? (
              reportsQuery.data?.reports.map((report) => (
                <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={report.reportId}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold">{report.title}</p>
                    <StatusPill value={report.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-neutral-400">{report.content}</p>
                </div>
              ))
            ) : (
              <EmptyState message={reportsQuery.isLoading ? "Đang tải báo cáo..." : "Chưa có báo cáo cho kỳ này."} />
            )}
          </div>
        </InternalPanel>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
