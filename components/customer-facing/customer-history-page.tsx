"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FiCreditCard, FiSearch, FiShoppingBag } from "react-icons/fi";

import { PaginationControl } from "@/components/ui/pagination-control";
import {
  getCustomerBookingsPage,
  getCustomerPaymentsPage,
} from "@/lib/client/api-client";
import type {
  CustomerBookingHistoryResponse,
  CustomerPaymentHistoryResponse,
} from "@/lib/shared/customer-activity";

type HistoryMode = "bookings" | "payments";

type CustomerHistoryPageProps = {
  mode: HistoryMode;
};

const PAGE_SIZE = 8;

function formatMoney(value: string, currency: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `${value} ${currency}`;
  }

  return `${amount.toLocaleString("vi-VN")} ${currency}`;
}

function BookingSpeculationRules({
  slugsOrIds,
}: {
  slugsOrIds: string[];
}) {
  const urls = slugsOrIds.slice(0, 8).map((tourId) => `/tours/${tourId}`);

  if (urls.length === 0) {
    return null;
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          prefetch: [
            {
              eagerness: "conservative",
              source: "list",
              urls,
            },
          ],
        }),
      }}
      key={urls.join("|")}
      type="speculationrules"
    />
  );
}

export function CustomerHistoryPage({ mode }: CustomerHistoryPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageCursors, setPageCursors] = useState<Record<number, string | null>>({ 1: null });
  const isBookings = mode === "bookings";
  const title = isBookings ? "Lịch sử đặt tour" : "Lịch sử thanh toán";
  const description = isBookings
    ? "Theo dõi các booking đã tạo, trạng thái thanh toán và ngày khởi hành."
    : "Tra cứu giao dịch thanh toán theo mã booking, nhà cung cấp và trạng thái.";
  const Icon = isBookings ? FiShoppingBag : FiCreditCard;
  const query = useQuery<CustomerBookingHistoryResponse | CustomerPaymentHistoryResponse>({
    queryFn: () =>
      isBookings
        ? getCustomerBookingsPage({
            cursor: pageCursors[page] ?? null,
            limit: PAGE_SIZE,
            query: searchQuery,
          })
        : getCustomerPaymentsPage({
            cursor: pageCursors[page] ?? null,
            limit: PAGE_SIZE,
            query: searchQuery,
          }),
    queryKey: ["customer", mode, page, pageCursors[page], searchQuery],
  });
  const bookings = useMemo(
    () => (isBookings && query.data && "bookings" in query.data ? query.data.bookings : []),
    [isBookings, query.data],
  );
  const payments = useMemo(
    () => (!isBookings && query.data && "payments" in query.data ? query.data.payments : []),
    [isBookings, query.data],
  );
  const nextCursor = query.data?.nextCursor ?? null;
  const bookingTourIds = useMemo(() => bookings.map((booking) => booking.tourId), [bookings]);

  const resetPaging = (nextQuery: string) => {
    setSearchQuery(nextQuery);
    setPage(1);
    setPageCursors({ 1: null });
  };

  const goNext = () => {
    if (!nextCursor) {
      return;
    }

    const nextPage = page + 1;
    setPageCursors((current) => ({ ...current, [nextPage]: nextCursor }));
    setPage(nextPage);
  };

  const goPrevious = () => {
    setPage((current) => Math.max(1, current - 1));
  };

  const goToPage = (targetPage: number) => {
    if (targetPage <= page && pageCursors[targetPage] !== undefined) {
      setPage(targetPage);
      return;
    }

    if (targetPage === page + 1 && nextCursor) {
      goNext();
    }
  };

  return (
    <main className="min-h-dvh bg-white text-slate-950 dark:bg-black dark:text-neutral-50">
      {isBookings ? <BookingSpeculationRules slugsOrIds={bookingTourIds} /> : null}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
        <section className="border-b border-slate-200 pb-6 dark:border-neutral-900">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-sky-700 dark:border-neutral-800 dark:text-sky-300">
              <Icon size={22} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase text-sky-700 dark:text-sky-300">
                Tài khoản khách hàng
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
                {description}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full sm:max-w-md">
            <span className="sr-only">Tìm kiếm thông tin</span>
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black dark:text-neutral-50"
              onChange={(event) => resetPaging(event.target.value)}
              placeholder={isBookings ? "Tìm mã booking, tour, trạng thái" : "Tìm mã thanh toán, booking, nhà cung cấp"}
              type="search"
              value={searchQuery}
            />
          </label>
          <PaginationControl
            canGoNext={Boolean(nextCursor)}
            canGoPrevious={page > 1}
            currentPage={page}
            disabled={query.isFetching}
            itemLabel={isBookings ? "booking" : "giao dịch"}
            onGoNext={goNext}
            onGoPrevious={goPrevious}
            onPageSubmit={goToPage}
            pageSize={PAGE_SIZE}
          />
        </div>

        <section className="overflow-hidden rounded-lg border border-slate-200 dark:border-neutral-800">
          {isBookings ? (
            <div className="divide-y divide-slate-200 dark:divide-neutral-800">
              {bookings.map((booking) => (
                <article className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto]" key={booking.bookingId}>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-slate-500 dark:text-neutral-500">
                      {booking.bookingCode}
                    </p>
                    <h2 className="mt-1 text-base font-semibold">{booking.tourTitle}</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                      Khởi hành {booking.departureDate} - {booking.status} - {booking.paymentStatus}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    <span className="text-sm font-semibold">
                      {formatMoney(booking.totalAmount, booking.currency)}
                    </span>
                    <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700 dark:border-neutral-800 dark:text-neutral-200" href={`/tours/${booking.tourId}`}>
                      Xem tour
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-neutral-800">
              {payments.map((payment) => (
                <article className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto]" key={payment.paymentId}>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-slate-500 dark:text-neutral-500">
                      {payment.paymentId}
                    </p>
                    <h2 className="mt-1 text-base font-semibold">Booking {payment.bookingId}</h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                      {payment.provider} - {payment.status}
                    </p>
                  </div>
                  <span className="text-sm font-semibold md:self-center">
                    {formatMoney(payment.amount, payment.currency)}
                  </span>
                </article>
              ))}
            </div>
          )}

          {!query.isLoading && bookings.length === 0 && payments.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600 dark:text-neutral-400">
              Không có dữ liệu phù hợp.
            </div>
          ) : null}

          {query.isLoading ? (
            <div className="p-8 text-center text-sm text-slate-600 dark:text-neutral-400">
              Đang tải dữ liệu...
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
