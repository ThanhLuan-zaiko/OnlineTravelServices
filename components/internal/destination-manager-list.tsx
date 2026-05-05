"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import { FiArchive, FiEdit3, FiGlobe, FiImage, FiMapPin, FiSearch, FiStar, FiTrash2, FiUploadCloud } from "react-icons/fi";

import { SelectField } from "@/components/ui/select-field";
import { PaginationControl } from "@/components/ui/pagination-control";
import type { InternalDestination } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";

type DestinationManagerListProps = {
  archivePending: boolean;
  destinations: InternalDestination[];
  hardDeletePending: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  isLoading: boolean;
  isPaging: boolean;
  onArchive: (destinationId: string) => void;
  onEdit: (destination: InternalDestination) => void;
  onHardDelete: (destinationId: string) => void;
  onJumpToPage: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onPublish: (destination: InternalDestination) => void;
  pageSize: number;
  pendingCoverImageDestinationId?: string | null;
  pendingCoverImageUrl?: string | null;
  searchQuery: string;
  setPageSize: Dispatch<SetStateAction<number>>;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setStatus: Dispatch<SetStateAction<string>>;
  status: string;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DestinationManagerList({
  archivePending,
  destinations,
  hardDeletePending,
  hasNextPage,
  hasPreviousPage,
  currentPage,
  isLoading,
  isPaging,
  onArchive,
  onEdit,
  onHardDelete,
  onJumpToPage,
  onNextPage,
  onPreviousPage,
  onPublish,
  pageSize,
  pendingCoverImageDestinationId,
  pendingCoverImageUrl,
  searchQuery,
  setPageSize,
  setSearchQuery,
  setStatus,
  status,
}: DestinationManagerListProps) {
  const statusOptions = [
    { label: "published", value: "published" },
    { label: "draft", value: "draft" },
  ];

  return (
    <InternalPanel className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Danh sách địa điểm</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
              Quản lý CRUD, thumbnail, soft delete và hard delete theo từng trang.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              buttonClassName="h-10 px-3 text-sm font-semibold"
              label="Trạng thái"
              name="destination-list-status"
              onValueChange={setStatus}
              options={statusOptions}
              placeholder="Chọn trạng thái"
              value={status}
            />
            <SelectField
              buttonClassName="h-10 px-3 text-sm font-semibold"
              label="Số item/trang"
              name="destination-list-page-size"
              onValueChange={(value) => setPageSize(Number(value))}
              options={pageSizeOptions}
              placeholder="Số item"
              value={String(pageSize)}
            />
          </div>
        </div>

        <label className="relative block">
          <span className="sr-only">Tìm kiếm nhanh</span>
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm theo tên, thành phố, quốc gia, danh mục, từ khóa..."
            value={searchQuery}
          />
        </label>
      </div>

      {destinations.length === 0 ? (
        <div className="mt-4">
          <EmptyState message={isLoading || isPaging ? "Đang tải địa điểm..." : "Không tìm thấy địa điểm phù hợp."} />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {destinations.map((destination, index) => {
              const previewUrl =
                pendingCoverImageDestinationId === destination.destinationId && pendingCoverImageUrl
                  ? pendingCoverImageUrl
                  : destination.coverImageUrl;

              return (
                <article
                  className="destination-card-enter overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-sky-50/40 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-neutral-800 dark:from-black dark:via-black dark:to-sky-950/10 dark:hover:shadow-black/40"
                  key={destination.destinationId}
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div className="grid gap-0 md:grid-cols-[13rem_1fr]">
                    <div className="relative min-h-56 bg-slate-100 dark:bg-neutral-900">
                      {previewUrl ? (
                        <Image
                          alt={destination.name}
                          className="h-full min-h-56 w-full object-cover"
                          height={260}
                          src={previewUrl}
                          unoptimized={previewUrl === pendingCoverImageUrl}
                          width={320}
                        />
                      ) : (
                        <div className="flex h-full min-h-56 items-center justify-center text-sm font-semibold text-slate-400">
                          Chưa có ảnh
                        </div>
                      )}
                      <div className="absolute left-3 top-3">
                        <StatusPill value={destination.status} />
                      </div>
                    </div>

                    <div className="space-y-4 p-4">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-lg font-semibold text-slate-950 dark:text-neutral-50">{destination.name}</p>
                            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-neutral-400">
                              <FiMapPin size={15} />
                              {destination.city}, {destination.region}, {destination.country}
                            </p>
                          </div>
                          <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-neutral-800 dark:text-neutral-300">
                            {destination.category}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                          {destination.description ?? "Không có mô tả."}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 dark:text-neutral-400">
                        <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">
                          <FiStar /> {destination.averageRating}/5
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">
                          <FiImage /> {destination.mediaCount} media
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">
                          <FiGlobe /> {destination.safetyLevel}
                        </span>
                        <span className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">Score {destination.popularityScore}</span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-500 dark:text-neutral-500">
                        <p>Tọa độ: {formatCoordinates(destination.latitude, destination.longitude)}</p>
                        <p>Cập nhật: {formatDate(destination.updatedAt)}</p>
                        {destination.searchKeywords.length > 0 ? <p>Từ khóa: {destination.searchKeywords.slice(0, 4).join(", ")}</p> : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                          onClick={() => onEdit(destination)}
                          type="button"
                        >
                          <FiEdit3 size={14} />
                          Sửa
                        </button>
                        {destination.status !== "published" ? (
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                            onClick={() => onPublish(destination)}
                            type="button"
                          >
                            <FiUploadCloud size={14} />
                            Publish
                          </button>
                        ) : null}
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 dark:border-amber-950 dark:text-amber-300 dark:hover:bg-amber-950/40"
                          disabled={archivePending || destination.status === "archived"}
                          onClick={() => onArchive(destination.destinationId)}
                          type="button"
                        >
                          <FiArchive size={14} />
                          Soft delete
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
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-neutral-800">
            <PaginationControl
              canGoNext={hasNextPage}
              canGoPrevious={hasPreviousPage}
              currentPage={currentPage}
              disabled={isPaging}
              itemLabel="item"
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
