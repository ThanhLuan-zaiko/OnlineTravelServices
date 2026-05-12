import type { Metadata } from "next";
import { FiMapPin, FiSearch } from "react-icons/fi";

import { requireCustomerPage } from "@/lib/server/customer-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tạo tour đề xuất | Online Travel Services",
};

export default async function NewSuggestedTourPage() {
  await requireCustomerPage("/suggested-tours/new");

  return (
    <main className="min-h-dvh bg-white text-slate-950 dark:bg-black dark:text-neutral-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <section className="border-b border-slate-200 pb-6 dark:border-neutral-900">
          <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
            Tour cá nhân riêng
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Tạo tour đề xuất</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
            Khu vực này chỉ mở khi khách hàng đã đăng nhập. Form chi tiết có thể nối với luồng suggested tours hiện có ở cổng nội bộ.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 p-5 dark:border-neutral-800">
          <label className="relative block">
            <span className="sr-only">Tìm điểm đến mong muốn</span>
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 dark:border-neutral-800 dark:bg-black"
              placeholder="Tìm điểm đến, ngân sách hoặc phong cách chuyến đi"
              type="search"
            />
          </label>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {["Điểm đến", "Ngân sách", "Số khách", "Lịch trình mong muốn"].map((label) => (
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-neutral-900" key={label}>
                <p className="inline-flex items-center gap-2 text-sm font-semibold">
                  <FiMapPin size={16} />
                  {label}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                  Đang chờ nối form gửi yêu cầu đề xuất tour.
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
