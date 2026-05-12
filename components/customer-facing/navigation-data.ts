import type { IconType } from "react-icons";
import {
  FiCalendar,
  FiCreditCard,
  FiEdit3,
  FiGift,
  FiGlobe,
  FiMapPin,
  FiSunrise,
} from "react-icons/fi";
import { LuHistory, LuMapPinned, LuMountainSnow } from "react-icons/lu";

export type SidebarItem = {
  description: string;
  href: string;
  icon: IconType;
  label: string;
  tone: string;
};

export type SuggestionCard = {
  detail: string;
  icon: IconType;
  label: string;
  tone: string;
};

export const sidebarItems: SidebarItem[] = [
  {
    label: "Du lịch trong nước",
    description: "Tour Việt Nam, nghỉ dưỡng, khám phá",
    href: "/tours/domestic",
    icon: LuMapPinned,
    tone: "bg-white text-emerald-700 ring-emerald-100 dark:bg-black dark:text-emerald-300 dark:ring-emerald-900",
  },
  {
    label: "Du lịch nước ngoài",
    description: "Châu Á, châu Âu, tour quốc tế",
    href: "/tours/international",
    icon: FiGlobe,
    tone: "bg-white text-sky-700 ring-sky-100 dark:bg-black dark:text-sky-300 dark:ring-sky-900",
  },
  {
    label: "Sự kiện",
    description: "Lễ hội, ưu đãi, lịch khởi hành",
    href: "/events",
    icon: FiCalendar,
    tone: "bg-white text-violet-700 ring-violet-100 dark:bg-black dark:text-violet-300 dark:ring-violet-900",
  },
  {
    label: "Thiết kế tour riêng",
    description: "Gửi yêu cầu tour cá nhân hóa",
    href: "/suggested-tours/new",
    icon: FiEdit3,
    tone: "bg-white text-teal-700 ring-teal-100 dark:bg-black dark:text-teal-300 dark:ring-teal-900",
  },
  {
    label: "Lịch sử đặt vé",
    description: "Theo dõi các đơn tour đã đặt",
    href: "/bookings",
    icon: LuHistory,
    tone: "bg-white text-amber-700 ring-amber-100 dark:bg-black dark:text-amber-300 dark:ring-amber-900",
  },
  {
    label: "Lịch sử thanh toán",
    description: "Biên lai và trạng thái giao dịch",
    href: "/payments",
    icon: FiCreditCard,
    tone: "bg-white text-rose-700 ring-rose-100 dark:bg-black dark:text-rose-300 dark:ring-rose-900",
  },
];

export const suggestionCards: SuggestionCard[] = [
  {
    label: "Gợi ý hôm nay",
    detail: "Ưu tiên tour ngắn ngày, lịch khởi hành rõ ràng.",
    icon: FiGift,
    tone: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-300",
  },
  {
    label: "Điểm đến nổi bật",
    detail: "Nội dung sẽ được kết nối dữ liệu ở bước sau.",
    icon: FiMapPin,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-300",
  },
  {
    label: "Tour nghỉ dưỡng",
    detail: "Không gian dành cho combo khách sạn, vé máy bay và lịch trình.",
    icon: FiSunrise,
    tone: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-950 dark:bg-sky-950/30 dark:text-sky-300",
  },
  {
    label: "Khám phá thiên nhiên",
    detail: "Sẵn sàng hiển thị tour núi, rừng, biển và trải nghiệm địa phương.",
    icon: LuMountainSnow,
    tone: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-950 dark:bg-violet-950/30 dark:text-violet-300",
  },
];
