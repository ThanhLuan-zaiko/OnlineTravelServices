"use client";

import Image from "next/image";
import { FiRefreshCw, FiTrash2 } from "react-icons/fi";

import type { InternalVehicleCatalogItem } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";
import { SearchInput } from "./vehicle-catalog-list-section";
import { imageFolderLabel } from "./vehicle-catalog-types";

export function VehicleMediaSection({
  catalog,
  hardDeletePending,
  isLoading,
  onHardDelete,
  onRestore,
  restorePending,
  searchQuery,
  setSearchQuery,
}: {
  catalog: InternalVehicleCatalogItem[];
  hardDeletePending: boolean;
  isLoading: boolean;
  onHardDelete: (item: InternalVehicleCatalogItem) => void;
  onRestore: (item: InternalVehicleCatalogItem) => void;
  restorePending: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
}) {
  return (
    <InternalPanel className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Kho lưu trữ phương tiện</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Các phương tiện đã xóa mềm vẫn giữ ảnh để có thể khôi phục hoặc xóa vĩnh viễn.
          </p>
        </div>
        <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {catalog.length === 0 ? (
          <div className="xl:col-span-2">
            <EmptyState message={isLoading ? "Đang tải kho lưu trữ..." : "Không có phương tiện nào trong kho lưu trữ."} />
          </div>
        ) : (
          catalog.map((item) => (
            <article
              className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-black"
              key={item.vehicleCatalogId}
            >
              <div className="grid gap-0 md:grid-cols-[12rem_1fr]">
                <div className="relative min-h-52 bg-slate-100 dark:bg-neutral-900">
                  {item.thumbnailUrl ? (
                    <Image alt={item.label} className="h-full min-h-52 w-full object-cover" height={250} src={item.thumbnailUrl} width={300} />
                  ) : (
                    <div className="flex h-full min-h-52 items-center justify-center text-sm font-semibold text-slate-400">Không có ảnh</div>
                  )}
                  <div className="absolute left-3 top-3">
                    <StatusPill value={item.status} />
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950 dark:text-neutral-50">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                      {item.vehicleType} - {item.vehicleModel} - {item.vehicleCapacity} chỗ
                    </p>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 dark:text-neutral-500">
                    {item.imageUrl ? <p>Ảnh: {imageFolderLabel(item.imageUrl)}</p> : <p>Không còn ảnh đại diện.</p>}
                    {item.archivedAt ? <p>Lưu trữ: {new Date(item.archivedAt).toLocaleString("vi-VN")}</p> : null}
                    <p>ID: {item.vehicleCatalogId}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                      disabled={restorePending}
                      onClick={() => onRestore(item)}
                      type="button"
                    >
                      <FiRefreshCw size={14} />
                      Khôi phục
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      disabled={hardDeletePending}
                      onClick={() => onHardDelete(item)}
                      type="button"
                    >
                      <FiTrash2 size={14} />
                      Xóa vĩnh viễn
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </InternalPanel>
  );
}
