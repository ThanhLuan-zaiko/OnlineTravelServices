"use client";

import Image from "next/image";
import { FiRefreshCw, FiTrash2 } from "react-icons/fi";

import { PaginationControl } from "@/components/ui/pagination-control";
import { SelectField } from "@/components/ui/select-field";
import type { InternalVehicleCatalogItem } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";
import { SearchInput } from "./vehicle-catalog-list-section";
import { imageFolderLabel } from "./vehicle-catalog-types";

export function VehicleMediaSection({
  catalog,
  currentPage,
  hardDeletePending,
  hasNextPage,
  hasPreviousPage,
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
}: {
  catalog: InternalVehicleCatalogItem[];
  currentPage: number;
  hardDeletePending: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  isPaging: boolean;
  onHardDelete: (item: InternalVehicleCatalogItem) => void;
  onJumpToPage: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onRestore: (item: InternalVehicleCatalogItem) => void;
  pageSize: number;
  restorePending: boolean;
  searchQuery: string;
  setPageSize: (value: number) => void;
  setSearchQuery: (value: string) => void;
}) {
  const pageSizeOptions = [
    { label: "6 items", value: "6" },
    { label: "8 items", value: "8" },
    { label: "12 items", value: "12" },
    { label: "24 items", value: "24" },
  ];

  return (
    <InternalPanel className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Kho lưu trữ phương tiện</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Các phương tiện đã xóa mềm vẫn giữ ảnh để có thể khôi phục hoặc xóa vĩnh viễn.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(16rem,1fr)_10rem]">
          <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
          <SelectField
            buttonClassName="h-10 px-3 text-sm font-semibold"
            label="Số item/trang"
            name="vehicle-catalog-archived-page-size"
            onValueChange={(value) => setPageSize(Number(value))}
            options={pageSizeOptions}
            placeholder="Số item"
            value={String(pageSize)}
          />
        </div>
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

      {catalog.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-neutral-800">
          <PaginationControl
            canGoNext={hasNextPage}
            canGoPrevious={hasPreviousPage}
            currentPage={currentPage}
            disabled={isPaging}
            itemLabel="phương tiện lưu trữ"
            onGoNext={onNextPage}
            onGoPrevious={onPreviousPage}
            onPageSubmit={onJumpToPage}
            pageSize={pageSize}
          />
        </div>
      ) : null}
    </InternalPanel>
  );
}
