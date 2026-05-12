"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiSearch,
  FiStar,
  FiUsers,
} from "react-icons/fi";

import { getPublicTourCountries, getPublicToursPage } from "@/lib/client/api-client";
import type {
  PublicTourFeed,
  PublicTourListItem,
  PublicTourListResponse,
} from "@/lib/shared/public-tours";

import { usePublicTourUpdates } from "./use-public-tour-updates";

type PublicTourExperienceProps = {
  feed: PublicTourFeed;
};

const feedContent: Record<PublicTourFeed, { eyebrow: string; title: string; description: string }> = {
  all: {
    description: "Tour đã xuất bản từ đội ngũ điều hành, có lịch khởi hành, giá và vị trí rõ ràng.",
    eyebrow: "Online Travel Services",
    title: "Khám phá tour đang mở bán",
  },
  domestic: {
    description: "Các chuyến đi trong Việt Nam với điểm đến, lịch trình và dịch vụ được cập nhật từ cổng nội bộ.",
    eyebrow: "Du lịch trong nước",
    title: "Tour Việt Nam nổi bật",
  },
  international: {
    description: "Tour quốc tế được chọn lọc theo điểm đến nước ngoài, giá và lịch khởi hành mới nhất.",
    eyebrow: "Du lịch nước ngoài",
    title: "Tour quốc tế đang mở",
  },
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

function tourMatchesQuery(tour: PublicTourListItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    tour.title,
    tour.destinationName,
    tour.country,
    tour.region,
    tour.city,
    tour.category,
    tour.tourType,
    tour.summary,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function SpeculationRules({ tours }: { tours: PublicTourListItem[] }) {
  const urls = tours.slice(0, 8).map((tour) => `/tours/${tour.slug}`);

  if (urls.length === 0) {
    return null;
  }

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          prefetch: [
            {
              eagerness: "moderate",
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

function TourCover({ tour }: { tour: PublicTourListItem }) {
  if (!tour.coverImageUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400 dark:bg-neutral-900 dark:text-neutral-600">
        <FiMapPin size={26} />
      </div>
    );
  }

  return (
    <Image
      alt={tour.title}
      className="object-cover"
      fill
      sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
      src={tour.coverImageUrl}
    />
  );
}

function TourCard({
  onSelect,
  selected,
  tour,
}: {
  onSelect: (tourId: string) => void;
  selected: boolean;
  tour: PublicTourListItem;
}) {
  return (
    <article
      className={`overflow-hidden rounded-lg border bg-white transition dark:bg-black ${
        selected
          ? "border-emerald-300 shadow-sm shadow-emerald-100 dark:border-emerald-800 dark:shadow-none"
          : "border-slate-200 hover:border-sky-200 dark:border-neutral-800 dark:hover:border-sky-900"
      }`}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        <TourCover tour={tour} />
        {tour.vipOnly ? (
          <span className="absolute left-3 top-3 rounded-md bg-slate-950 px-2 py-1 text-xs font-semibold text-white">
            VIP
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                {tour.destinationName}
              </p>
              <h2 className="mt-1 line-clamp-2 text-lg font-semibold leading-snug text-slate-950 dark:text-neutral-50">
                {tour.title}
              </h2>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 dark:border-amber-900 dark:text-amber-300">
              <FiStar size={13} />
              {Number(tour.averageRating).toFixed(1)}
            </span>
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
            {tour.summary ?? `${tour.category} tại ${tour.city}, ${tour.country}`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-neutral-400">
          <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2 py-2 dark:bg-neutral-900">
            <FiClock size={14} />
            {tour.durationDays}N{tour.durationNights > 0 ? `/${tour.durationNights}Đ` : ""}
          </span>
          <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2 py-2 dark:bg-neutral-900">
            <FiUsers size={14} />
            {tour.minGuests}-{tour.maxGuests} khách
          </span>
          <span className="col-span-2 inline-flex items-center gap-2 rounded-md bg-slate-50 px-2 py-2 dark:bg-neutral-900">
            <FiCalendar size={14} />
            {tour.nextDeparture
              ? `${formatDate(tour.nextDeparture.date)} lúc ${tour.nextDeparture.time}`
              : "Đang cập nhật lịch"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-neutral-900">
          <div>
            <p className="text-xs text-slate-500 dark:text-neutral-500">Từ</p>
            <p className="text-base font-semibold text-slate-950 dark:text-neutral-50">
              {formatMoney(tour.basePrice, tour.currency)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-neutral-800 dark:text-neutral-200 dark:hover:border-emerald-800 dark:hover:text-emerald-300"
              onClick={() => onSelect(tour.tourId)}
              type="button"
            >
              Chọn
            </button>
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-sky-700 dark:bg-neutral-50 dark:text-black dark:hover:bg-sky-200"
              href={`/tours/${tour.slug}`}
            >
              Xem
              <FiArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function GoogleMapPanel({ tour }: { tour: PublicTourListItem | null }) {
  const hasCoordinates =
    tour && Number.isFinite(tour.latitude) && Number.isFinite(tour.longitude);
  const mapUrl = hasCoordinates
    ? `https://www.google.com/maps?q=${encodeURIComponent(`${tour.latitude},${tour.longitude}`)}&hl=vi&z=12&output=embed`
    : null;

  return (
    <aside className="sticky top-24 flex max-h-[calc(100dvh-7rem)] flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-black">
        <p className="text-xs font-semibold uppercase text-sky-700 dark:text-sky-300">
          Google Map
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950 dark:text-neutral-50">
          {tour?.destinationName ?? "Điểm đến"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
          {tour
            ? [tour.destinationAddress, tour.city, tour.country].filter(Boolean).join(", ")
            : "Chưa có tour trong danh sách."}
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-neutral-800 dark:bg-neutral-900">
        {mapUrl ? (
          <iframe
            className="h-[24rem] w-full border-0 xl:h-[32rem]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={mapUrl}
            title={`Bản đồ ${tour?.destinationName ?? "tour"}`}
          />
        ) : (
          <div className="flex h-[24rem] items-center justify-center px-6 text-center text-sm text-slate-500 dark:text-neutral-400 xl:h-[32rem]">
            Chưa có tọa độ để hiển thị bản đồ.
          </div>
        )}
      </div>
    </aside>
  );
}

export function PublicTourExperience({ feed }: PublicTourExperienceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [countryKey, setCountryKey] = useState<string | null>(null);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const content = feedContent[feed];

  usePublicTourUpdates(feed);

  const countriesQuery = useQuery({
    enabled: feed === "international",
    queryFn: () => getPublicTourCountries(feed),
    queryKey: ["public", "tour-countries", feed],
  });

  const toursQuery = useInfiniteQuery<PublicTourListResponse>({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      getPublicToursPage({
        cursor: typeof pageParam === "string" ? pageParam : null,
        countryKey,
        feed,
        limit: 8,
      }),
    queryKey: ["public", "tours", feed, countryKey],
  });

  const tours = useMemo(
    () => toursQuery.data?.pages.flatMap((page) => page.tours) ?? [],
    [toursQuery.data],
  );
  const filteredTours = useMemo(
    () => tours.filter((tour) => tourMatchesQuery(tour, searchQuery)),
    [searchQuery, tours],
  );
  const selectedTour =
    filteredTours.find((tour) => tour.tourId === selectedTourId) ??
    filteredTours[0] ??
    tours[0] ??
    null;

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && toursQuery.hasNextPage && !toursQuery.isFetchingNextPage) {
          void toursQuery.fetchNextPage();
        }
      },
      { rootMargin: "600px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [toursQuery]);

  return (
    <>
      <SpeculationRules tours={filteredTours.length > 0 ? filteredTours : tours} />
      <section className="flex flex-col gap-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0">
            <div className="border-b border-slate-200 pb-6 dark:border-neutral-900">
              <p className="text-xs font-semibold uppercase text-sky-700 dark:text-sky-300">
                {content.eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-normal text-slate-950 dark:text-neutral-50 sm:text-4xl">
                {content.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
                {content.description}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative block w-full sm:max-w-md">
                <span className="sr-only">Tìm kiếm tour</span>
                <FiSearch
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black dark:text-neutral-50"
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Tìm tour, điểm đến, thành phố"
                  type="search"
                  value={searchQuery}
                />
              </label>
              <p className="text-sm font-medium text-slate-500 dark:text-neutral-400">
                {filteredTours.length.toLocaleString("vi-VN")} tour
              </p>
            </div>

            {feed === "international" ? (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Lọc theo quốc gia">
                <button
                  className={`h-10 shrink-0 rounded-md border px-3 text-sm font-semibold transition ${
                    !countryKey
                      ? "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300"
                      : "border-slate-200 text-slate-700 hover:border-sky-200 dark:border-neutral-800 dark:text-neutral-200"
                  }`}
                  onClick={() => {
                    setCountryKey(null);
                    setSelectedTourId(null);
                  }}
                  type="button"
                >
                  Tất cả quốc gia
                </button>
                {(countriesQuery.data?.countries ?? []).map((country) => (
                  <button
                    className={`h-10 shrink-0 rounded-md border px-3 text-sm font-semibold transition ${
                      countryKey === country.countryKey
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-slate-200 text-slate-700 hover:border-emerald-200 dark:border-neutral-800 dark:text-neutral-200"
                    }`}
                    key={country.countryKey}
                    onClick={() => {
                      setCountryKey(country.countryKey);
                      setSelectedTourId(null);
                    }}
                    type="button"
                  >
                    {country.country}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {filteredTours.map((tour) => (
                <TourCard
                  key={tour.tourId}
                  onSelect={setSelectedTourId}
                  selected={selectedTour?.tourId === tour.tourId}
                  tour={tour}
                />
              ))}
            </div>

            {toursQuery.isLoading ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    className="h-80 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-neutral-800 dark:bg-neutral-900"
                    key={index}
                  />
                ))}
              </div>
            ) : null}

            {!toursQuery.isLoading && filteredTours.length === 0 ? (
              <div className="mt-5 rounded-lg border border-dashed border-slate-300 p-8 text-center dark:border-neutral-800">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-neutral-50">
                  Chưa có tour phù hợp
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
                  Danh sách sẽ cập nhật khi staff xuất bản tour mới.
                </p>
              </div>
            ) : null}

            <div className="h-8" ref={loadMoreRef} />

            {toursQuery.isFetchingNextPage ? (
              <p className="pb-6 text-center text-sm font-medium text-slate-500 dark:text-neutral-400">
                Đang tải thêm tour...
              </p>
            ) : null}
          </div>

          <div className="hidden xl:block">
            <GoogleMapPanel tour={selectedTour} />
          </div>
        </div>

        <div className="xl:hidden">
          <GoogleMapPanel tour={selectedTour} />
        </div>
      </section>
    </>
  );
}
