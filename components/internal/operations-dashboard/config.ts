import {
  FiActivity,
  FiBarChart2,
  FiBell,
  FiCalendar,
  FiDownload,
  FiFileText,
  FiSave,
  FiSend,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";

import type {
  OperationsModule,
  OperationsModuleCopy,
  OperationsNavItem,
  OperationsTab,
  TourStatus,
  TrendForm,
} from "./types";

export const operationModules: Array<OperationsNavItem<OperationsModule>> = [
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

export const operationModuleTabs: Record<OperationsModule, Array<OperationsNavItem<OperationsTab>>> = {
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

export const moduleCopy: Record<OperationsModule, OperationsModuleCopy> = {
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

export const lifecycleLabels: Record<TourStatus, string> = {
  cancelled: "Hủy lịch",
  completed: "Hoàn thành",
  in_progress: "Đang diễn ra",
  preparing: "Chuẩn bị",
};

export const analysisLabels: Record<TrendForm["analysisType"], string> = {
  customer_trend: "Xu hướng khách",
  demand_forecast: "Dự đoán nhu cầu",
  destination_effectiveness: "Hiệu quả địa điểm",
  promotion_sentiment: "Khuyến mãi",
};

export function getDefaultTab(module: OperationsModule): OperationsTab {
  return operationModuleTabs[module][0]?.key ?? "dashboard";
}
