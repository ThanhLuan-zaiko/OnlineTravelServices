import Image from "next/image";
import Link from "next/link";
import {
  FiArrowLeft,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiStar,
  FiUsers,
} from "react-icons/fi";

import type { PublicTourDetail as PublicTourDetailType } from "@/lib/shared/public-tours";

import { TourBookingPanel } from "./tour-booking-panel";
import { TourReviewPanel } from "./tour-review-panel";

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

function GoogleMapFrame({ tour }: { tour: PublicTourDetailType }) {
  const hasCoordinates = Number.isFinite(tour.latitude) && Number.isFinite(tour.longitude);
  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${tour.latitude},${tour.longitude}`)}&hl=vi&z=12&output=embed`
    : null;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-neutral-800 dark:bg-neutral-900">
      {mapUrl ? (
        <iframe
          className="h-80 w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={mapUrl}
          title={`Bản đồ ${tour.destinationName}`}
        />
      ) : (
        <div className="flex h-80 items-center justify-center text-sm text-slate-500 dark:text-neutral-400">
          Chưa có tọa độ.
        </div>
      )}
    </div>
  );
}

function HeroImage({ tour }: { tour: PublicTourDetailType }) {
  if (!tour.coverImageUrl) {
    return (
      <div className="flex h-full min-h-[24rem] items-center justify-center bg-slate-100 text-slate-400 dark:bg-neutral-900">
        <FiMapPin size={36} />
      </div>
    );
  }

  return (
    <Image
      alt={tour.title}
      className="object-cover"
      fill
      priority
      sizes="100vw"
      src={tour.coverImageUrl}
    />
  );
}

export function PublicTourDetail({ tour }: { tour: PublicTourDetailType }) {
  const nextSchedules = tour.schedules.filter((schedule) => schedule.status === "open").slice(0, 4);

  return (
    <main className="min-h-dvh bg-white text-slate-950 dark:bg-black dark:text-neutral-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:py-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-sky-900 dark:hover:text-sky-300"
            href="/"
          >
            <FiArrowLeft size={16} />
            Trang chủ
          </Link>
          <Link
            className="inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 dark:bg-neutral-50 dark:text-black dark:hover:bg-sky-200"
            href="/login"
          >
            Đăng nhập
          </Link>
        </div>

        <section className="grid overflow-hidden rounded-lg border border-slate-200 dark:border-neutral-800 lg:grid-cols-[minmax(0,1.35fr)_minmax(24rem,0.65fr)]">
          <div className="relative min-h-[24rem]">
            <HeroImage tour={tour} />
          </div>
          <div className="flex flex-col justify-between gap-6 bg-white p-5 dark:bg-black sm:p-6">
            <div>
              <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                {tour.destinationName}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
                {tour.title}
              </h1>
              <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                {tour.summary ?? `${tour.category} tại ${tour.city}, ${tour.country}`}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
                <p className="text-xs text-slate-500 dark:text-neutral-500">Giá từ</p>
                <p className="mt-1 text-lg font-semibold">{formatMoney(tour.basePrice, tour.currency)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
                <p className="text-xs text-slate-500 dark:text-neutral-500">Đánh giá</p>
                <p className="mt-1 inline-flex items-center gap-2 text-lg font-semibold">
                  <FiStar className="text-amber-500" size={18} />
                  {Number(tour.averageRating).toFixed(1)} ({tour.ratingCount})
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
                <p className="text-xs text-slate-500 dark:text-neutral-500">Thời lượng</p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold">
                  <FiClock size={16} />
                  {tour.durationDays} ngày {tour.durationNights} đêm
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3 dark:border-neutral-800">
                <p className="text-xs text-slate-500 dark:text-neutral-500">Số khách</p>
                <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold">
                  <FiUsers size={16} />
                  {tour.minGuests}-{tour.maxGuests}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border border-slate-200 p-5 dark:border-neutral-800">
              <h2 className="text-xl font-semibold">Lịch khởi hành</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {nextSchedules.length > 0 ? (
                  nextSchedules.map((schedule) => (
                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-neutral-900" key={schedule.scheduleId}>
                      <p className="inline-flex items-center gap-2 text-sm font-semibold">
                        <FiCalendar size={16} />
                        {formatDate(schedule.departureDate)} lúc {schedule.departureTime}
                      </p>
                      <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                        {formatMoney(schedule.price, schedule.currency)} - còn {schedule.availableSlots} chỗ
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600 dark:text-neutral-400">
                    Lịch khởi hành đang được cập nhật.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 p-5 dark:border-neutral-800">
              <h2 className="text-xl font-semibold">Lịch trình</h2>
              <div className="mt-4 flex flex-col gap-3">
                {tour.itinerary.length > 0 ? (
                  tour.itinerary.map((item) => (
                    <div className="rounded-lg bg-slate-50 p-4 dark:bg-neutral-900" key={`${item.dayNumber}-${item.itemOrder}`}>
                      <p className="text-sm font-semibold">
                        Ngày {item.dayNumber}: {item.title}
                      </p>
                      {item.description ? (
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                          {item.description}
                        </p>
                      ) : null}
                      {item.locationName ? (
                        <p className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-neutral-500">
                          <FiMapPin size={14} />
                          {item.locationName}
                        </p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600 dark:text-neutral-400">
                    Lịch trình đang được cập nhật.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-5 dark:border-neutral-800">
                <h2 className="text-xl font-semibold">Bao gồm</h2>
                <div className="mt-4 flex flex-col gap-2">
                  {tour.includedServices.length > 0 ? (
                    tour.includedServices.map((service) => (
                      <p className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-neutral-300" key={service}>
                        <FiCheckCircle className="text-emerald-600" size={16} />
                        {service}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-slate-600 dark:text-neutral-400">Đang cập nhật.</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-5 dark:border-neutral-800">
                <h2 className="text-xl font-semibold">Thư viện ảnh</h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {tour.gallery.slice(0, 4).map((item) => (
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-slate-100 dark:bg-neutral-900" key={item.mediaId}>
                      <Image
                        alt={item.title ?? tour.title}
                        className="object-cover"
                        fill
                        sizes="(min-width: 768px) 180px, 50vw"
                        src={item.thumbnailUrl}
                      />
                    </div>
                  ))}
                  {tour.gallery.length === 0 ? (
                    <p className="col-span-2 text-sm text-slate-600 dark:text-neutral-400">Đang cập nhật.</p>
                  ) : null}
                </div>
              </div>
            </div>

            <TourReviewPanel slug={tour.slug} />
          </div>

          <aside className="flex flex-col gap-4">
            <TourBookingPanel
              maxGuests={tour.maxGuests}
              minGuests={tour.minGuests}
              schedules={tour.schedules}
              slug={tour.slug}
              title={tour.title}
              tourId={tour.tourId}
            />
            <div className="rounded-lg border border-slate-200 p-4 dark:border-neutral-800">
              <p className="text-xs font-semibold uppercase text-sky-700 dark:text-sky-300">
                Vị trí
              </p>
              <h2 className="mt-2 text-lg font-semibold">{tour.destinationName}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                {[tour.destinationAddress, tour.city, tour.country].filter(Boolean).join(", ")}
              </p>
            </div>
            <GoogleMapFrame tour={tour} />
          </aside>
        </section>
      </div>
    </main>
  );
}
