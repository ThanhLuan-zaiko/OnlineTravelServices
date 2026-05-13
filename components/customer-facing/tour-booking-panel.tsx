"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FiCalendar, FiCheckCircle, FiShoppingBag, FiUsers } from "react-icons/fi";

import { useAuthSession } from "@/hooks/use-auth-session";
import { createCustomerBooking, type ApiError } from "@/lib/client/api-client";
import type { CustomerBookingMutationRequest } from "@/lib/shared/bookings";
import type { PublicTourScheduleSummary } from "@/lib/shared/public-tours";
import { useToast } from "@/components/ui/toast";

type TourBookingPanelProps = {
  maxGuests: number;
  minGuests: number;
  schedules: PublicTourScheduleSummary[];
  slug: string;
  title: string;
  tourId: string;
};

function formatMoney(value: string, currency: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `${value} ${currency}`;
  }

  return `${amount.toLocaleString("vi-VN")} ${currency}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function scheduleLabel(schedule: PublicTourScheduleSummary) {
  return `${formatDate(schedule.departureDate)} - ${schedule.departureTime} - còn ${schedule.availableSlots} chỗ`;
}

export function TourBookingPanel({
  maxGuests,
  minGuests,
  schedules: initialSchedules,
  slug,
  title,
  tourId,
}: TourBookingPanelProps) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const openSchedules = useMemo(
    () => schedules.filter((schedule) => schedule.status === "open" && schedule.availableSlots > 0),
    [schedules],
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState(openSchedules[0]?.scheduleId ?? "");
  const selectedSchedule = openSchedules.find((schedule) => schedule.scheduleId === selectedScheduleId) ?? openSchedules[0] ?? null;
  const minGuestCount = Math.max(1, minGuests);
  const selectedMaxGuests = selectedSchedule ? Math.min(maxGuests, selectedSchedule.availableSlots) : maxGuests;
  const [guestCount, setGuestCount] = useState(minGuestCount);
  const [specialRequests, setSpecialRequests] = useState("");
  const sessionQuery = useAuthSession();
  const user = sessionQuery.data?.user ?? null;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const bookingMutation = useMutation({
    mutationFn: (input: CustomerBookingMutationRequest) => createCustomerBooking(input),
    onError: (error: ApiError) => {
      showToast({
        message: error.message || "Không thể tạo booking lúc này.",
        title: error.status === 409 ? "Không đủ chỗ" : "Booking chưa được tạo",
        variant: "error",
      });
    },
    onSuccess: async (response) => {
      const booking = response.booking;

      setSchedules((current) =>
        current.map((schedule) =>
          schedule.scheduleId === booking.scheduleId
            ? {
                ...schedule,
                availableSlots: Math.max(0, schedule.availableSlots - booking.guestCount),
                bookedSlots: schedule.bookedSlots + booking.guestCount,
              }
            : schedule,
        ),
      );
      setSpecialRequests("");
      setGuestCount(minGuestCount);
      await queryClient.invalidateQueries({ queryKey: ["customer", "bookings"] });
      await queryClient.invalidateQueries({ queryKey: ["public", "tours"] });
      showToast({
        message: `Mã booking ${booking.bookingCode} đã được tạo.`,
        title: "Đã giữ chỗ",
        variant: "success",
      });
    },
  });

  const canBook =
    Boolean(user) &&
    Boolean(selectedSchedule) &&
    selectedMaxGuests >= minGuestCount &&
    guestCount >= minGuestCount &&
    guestCount <= selectedMaxGuests &&
    !bookingMutation.isPending;

  return (
    <section className="rounded-lg border border-slate-200 p-4 dark:border-neutral-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
            Đặt tour
          </p>
          <h2 className="mt-2 text-lg font-semibold">{title}</h2>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
          <FiShoppingBag size={18} />
        </span>
      </div>

      {openSchedules.length > 0 ? (
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();

            if (!canBook || !selectedSchedule) {
              return;
            }

            bookingMutation.mutate({
              departureDate: selectedSchedule.departureDate,
              guestCount,
              scheduleId: selectedSchedule.scheduleId,
              specialRequests,
              tourId,
            });
          }}
        >
          <label className="text-sm font-semibold" htmlFor="booking-schedule">
            Lịch khởi hành
          </label>
          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black"
            id="booking-schedule"
            onChange={(event) => {
              setSelectedScheduleId(event.target.value);
              setGuestCount(minGuestCount);
            }}
            value={selectedSchedule?.scheduleId ?? ""}
          >
            {openSchedules.map((schedule) => (
              <option key={schedule.scheduleId} value={schedule.scheduleId}>
                {scheduleLabel(schedule)}
              </option>
            ))}
          </select>

          {selectedSchedule ? (
            <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-neutral-900">
              <p className="inline-flex items-center gap-2 font-semibold">
                <FiCalendar size={15} />
                {formatDate(selectedSchedule.departureDate)} lúc {selectedSchedule.departureTime}
              </p>
              <p className="inline-flex items-center gap-2 text-slate-600 dark:text-neutral-400">
                <FiUsers size={15} />
                {formatMoney(selectedSchedule.price, selectedSchedule.currency)} / khách - còn {selectedSchedule.availableSlots} chỗ
              </p>
            </div>
          ) : null}

          <label className="text-sm font-semibold" htmlFor="booking-guest-count">
            Số khách
          </label>
          <input
            className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black"
            id="booking-guest-count"
            max={Math.max(minGuestCount, selectedMaxGuests)}
            min={minGuestCount}
            onChange={(event) => {
              const nextGuestCount = Number(event.target.value);

              setGuestCount(Math.min(Math.max(nextGuestCount, minGuestCount), Math.max(minGuestCount, selectedMaxGuests)));
            }}
            type="number"
            value={guestCount}
          />

          <label className="text-sm font-semibold" htmlFor="booking-special-requests">
            Yêu cầu đặc biệt
          </label>
          <textarea
            className="min-h-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black"
            id="booking-special-requests"
            maxLength={1000}
            onChange={(event) => setSpecialRequests(event.target.value)}
            placeholder="Thông tin đón khách, lưu ý ăn uống hoặc hỗ trợ thêm"
            value={specialRequests}
          />

          {selectedMaxGuests < minGuestCount ? (
            <p className="text-sm font-medium text-rose-600 dark:text-rose-300">
              Lịch này không còn đủ số khách tối thiểu.
            </p>
          ) : null}

          {!user ? (
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-sky-200 px-4 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-sky-950/40"
              href={`/login?next=${encodeURIComponent(`/tours/${slug}`)}`}
            >
              Đăng nhập để đặt tour
            </Link>
          ) : (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-50 dark:text-black dark:hover:bg-sky-200"
              disabled={!canBook || sessionQuery.isLoading}
              type="submit"
            >
              <FiCheckCircle size={16} />
              {bookingMutation.isPending ? "Đang giữ chỗ" : "Giữ chỗ"}
            </button>
          )}
        </form>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-neutral-400">
          Hiện chưa có lịch khởi hành còn chỗ.
        </p>
      )}
    </section>
  );
}
