"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";

import { SelectField } from "@/components/ui/select-field";
import type { InternalDestination } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";

type DestinationManagerListProps = {
  archivePending: boolean;
  destinations: InternalDestination[];
  onArchive: (destinationId: string) => void;
  onEdit: (destination: InternalDestination) => void;
  status: string;
  setStatus: Dispatch<SetStateAction<string>>;
  isLoading: boolean;
};

function formatCoordinates(latitude: unknown, longitude: unknown) {
  const nextLatitude = typeof latitude === "number" && Number.isFinite(latitude) ? latitude : null;
  const nextLongitude = typeof longitude === "number" && Number.isFinite(longitude) ? longitude : null;

  if (nextLatitude === null || nextLongitude === null) {
    return "Không có tọa độ hợp lệ";
  }

  return `${nextLatitude.toFixed(6)}, ${nextLongitude.toFixed(6)}`;
}

export function DestinationManagerList({
  archivePending,
  destinations,
  onArchive,
  onEdit,
  status,
  setStatus,
  isLoading,
}: DestinationManagerListProps) {
  const statusOptions = [
    { label: "draft", value: "draft" },
    { label: "published", value: "published" },
    { label: "archived", value: "archived" },
  ];

  return (
    <InternalPanel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Danh sách địa điểm</h3>
        <SelectField
          buttonClassName="h-10 px-3 text-sm font-semibold"
          label="Bộ lọc trạng thái"
          name="destination-list-status"
          onValueChange={setStatus}
          options={statusOptions}
          placeholder="Tất cả"
          value={status}
        />
      </div>

      {destinations.length === 0 ? (
        <div className="mt-4">
          <EmptyState message={isLoading ? "Đang tải địa điểm..." : "Chưa có địa điểm nào."} />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {destinations.map((destination) => (
            <article className="rounded-2xl border border-slate-200 p-3 dark:border-neutral-800" key={destination.destinationId}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">{destination.name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                    {destination.city}, {destination.region}, {destination.country}
                  </p>
                </div>
                <StatusPill value={destination.status} />
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[7rem_1fr]">
                {destination.coverImageUrl ? (
                  <Image alt={destination.name} className="h-24 w-full rounded-xl object-cover" height={96} src={destination.coverImageUrl} width={128} />
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400 dark:border-neutral-800">
                    Chưa có ảnh
                  </div>
                )}
                <div className="space-y-2 text-sm text-slate-600 dark:text-neutral-400">
                  <p>{destination.description ?? "Không có mô tả."}</p>
                  <p>
                    Tọa độ: {formatCoordinates(destination.latitude, destination.longitude)}
                  </p>
                  <p>Media: {destination.mediaCount}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                      onClick={() => onEdit(destination)}
                      type="button"
                    >
                      Sửa
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      disabled={archivePending || destination.status === "archived"}
                      onClick={() => onArchive(destination.destinationId)}
                      type="button"
                    >
                      Xóa/Lưu trữ
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </InternalPanel>
  );
}
