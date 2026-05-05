"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import { FiMapPin, FiRefreshCw, FiSearch, FiShield, FiTrash2 } from "react-icons/fi";

import { SelectField } from "@/components/ui/select-field";
import { PaginationControl } from "@/components/ui/pagination-control";
import type { InternalDestination } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";

type DestinationManagerArchivedListProps = {
  destinations: InternalDestination[];
  hardDeletePending: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  isLoading: boolean;
  isPaging: boolean;
  onHardDelete: (destinationId: string) => void;
  onJumpToPage: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onRestore: (destinationId: string) => void;
  pageSize: number;
  restorePending: boolean;
  searchQuery: string;
  setPageSize: Dispatch<SetStateAction<number>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
};

const pageSizeOptions = [
  { label: "6 items", value: "6" },
  { label: "8 items", value: "8" },
  { label: "12 items", value: "12" },
  { label: "24 items", value: "24" },
];

function formatCoordinates(latitude: unknown, longitude: unknown) {
  const nextLatitude = typeof latitude === "number" && Number.isFinite(latitude) ? latitude : null;
  const nextLongitude = typeof longitude === "number" && Number.isFinite(longitude) ? longitude : null;

  if (nextLatitude === null || nextLongitude === null) {
    return "Không có tọa độ hợp lệ";
  }

  return `${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}`;
}

export function DestinationManagerArchivedList({
  destinations,
  hardDeletePending,
  hasNextPage,
  hasPreviousPage,
  currentPage,
  isLoading,
  isPaging,
  onHardDelete,
  onJumpToPage,
  onNextPage,
  onPreviousPage,
  onRestore,
  pageSize,
  restorePending,
  searchQuery,
  setPageSize,
  setSearchQuery,
}: DestinationManagerArchivedListProps) {
  return (
    <InternalPanel className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Địa điểm đã lưu trữ</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
              Restore soft delete về draft, hoặc hard delete vĩnh viễn khi cần dọn dữ liệu.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <StatusPill value="archived" />
            <SelectField
              buttonClassName="h-10 px-3 text-sm font-semibold"
              label="Số item/trang"
              name="destination-archived-page-size"
              onValueChange={(value) => setPageSize(Number(value))}
              options={pageSizeOptions}
              placeholder="Số item"
              value={String(pageSize)}
            />
          </div>
        </div>

        <label className="relative block">
          <span className="sr-only">Tìm kiếm archived</span>
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm archived theo tên, thành phố, danh mục, từ khóa..."
            value={searchQuery}
          />
        </label>
      </div>

      {destinations.length === 0 ? (
        <div className="mt-4">
          <EmptyState message={isLoading || isPaging ? "Đang tải địa điểm đã lưu trữ..." : "Không tìm thấy địa điểm archived phù hợp."} />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {destinations.map((destination, index) => (
              <article
                className="destination-card-enter overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-neutral-800 dark:bg-black dark:hover:shadow-black/40"
                key={destination.destinationId}
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <div className="grid gap-0 sm:grid-cols-[11rem_1fr]">
                  <div className="relative min-h-44 bg-slate-100 dark:bg-neutral-900">
                    {destination.coverImageUrl ? (
                      <Image alt={destination.name} className="h-full min-h-44 w-full object-cover grayscale-[25%]" height={210} src={destination.coverImageUrl} width={260} />
                    ) : (
                      <div className="flex h-full min-h-44 items-center justify-center text-sm font-semibold text-slate-400">
                        Chưa có ảnh
                      </div>
                    )}
                    <div className="absolute left-3 top-3">
                      <StatusPill value={destination.status} />
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div>
                      <p className="truncate text-base font-semibold text-slate-950 dark:text-neutral-50">{destination.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-neutral-400">
                        <FiMapPin size={15} />
                        {destination.city}, {destination.region}, {destination.country}
                      </p>
                    </div>
                    <p className="line-clamp-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                      {destination.description ?? "Không có mô tả."}
                    </p>
                    <div className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-neutral-400 sm:grid-cols-2">
                      <span className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">{destination.category}</span>
                      <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">
                        <FiShield /> {destination.safetyLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-neutral-500">Tọa độ: {formatCoordinates(destination.latitude, destination.longitude)}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                        disabled={restorePending}
                        onClick={() => onRestore(destination.destinationId)}
                        type="button"
                      >
                        <FiRefreshCw size={14} />
                        Restore draft
                      </button>
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                        disabled={hardDeletePending}
                        onClick={() => onHardDelete(destination.destinationId)}
                        type="button"
                      >
                        <FiTrash2 size={14} />
                        Hard delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-neutral-800">
            <PaginationControl
              canGoNext={hasNextPage}
              canGoPrevious={hasPreviousPage}
              currentPage={currentPage}
              disabled={isPaging}
              itemLabel="archived item"
              onGoNext={onNextPage}
              onGoPrevious={onPreviousPage}
              onPageSubmit={onJumpToPage}
              pageSize={pageSize}
            />
          </div>
        </>
      )}
    </InternalPanel>
  );
}
