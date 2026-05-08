"use client";

import Image from "next/image";
import { FiImage, FiSearch, FiTrash2 } from "react-icons/fi";

import { PaginationControl } from "@/components/ui/pagination-control";
import { SelectField } from "@/components/ui/select-field";
import type { InternalVehicleCatalogItem } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";
import { imageFolderLabel } from "./vehicle-catalog-types";

export function VehicleListSection({
  catalog,
  deletePending,
  hardDeletePending,
  hasNextPage,
  hasPreviousPage,
  currentPage,
  isLoading,
  isPaging,
  onDelete,
  onEdit,
  onHardDelete,
  onJumpToPage,
  onManageImage,
  onNextPage,
  onPreviousPage,
  pageSize,
  searchQuery,
  setPageSize,
  setSearchQuery,
  setStatus,
  status,
}: {
  catalog: InternalVehicleCatalogItem[];
  deletePending: boolean;
  hardDeletePending: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  currentPage: number;
  isLoading: boolean;
  isPaging: boolean;
  onDelete: (item: InternalVehicleCatalogItem) => void;
  onEdit: (item: InternalVehicleCatalogItem) => void;
  onHardDelete: (item: InternalVehicleCatalogItem) => void;
  onJumpToPage: (page: number) => void;
  onManageImage: (item: InternalVehicleCatalogItem) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pageSize: number;
  searchQuery: string;
  setPageSize: (value: number) => void;
  setSearchQuery: (value: string) => void;
  setStatus: (value: string) => void;
  status: string;
}) {
  return (
    <InternalPanel className="p-4">
      <VehicleFilters
        pageSize={pageSize}
        searchQuery={searchQuery}
        setPageSize={setPageSize}
        setSearchQuery={setSearchQuery}
        setStatus={setStatus}
        status={status}
      />
      <VehicleCards
        catalog={catalog}
        deletePending={deletePending}
        hardDeletePending={hardDeletePending}
        emptyMessage={isLoading ? "Đang tải danh mục phương tiện..." : "Không tìm thấy phương tiện phù hợp."}
        onDelete={onDelete}
        onEdit={onEdit}
        onHardDelete={onHardDelete}
        onManageImage={onManageImage}
      />
      {catalog.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-neutral-800">
          <PaginationControl
            canGoNext={hasNextPage}
            canGoPrevious={hasPreviousPage}
            currentPage={currentPage}
            disabled={isPaging}
            itemLabel="phương tiện"
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

export function SearchInput({
  searchQuery,
  setSearchQuery,
  wide = false,
}: {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "relative block" : "space-y-2"}>
      <span className={wide ? "sr-only" : "text-sm font-semibold"}>Tìm kiếm</span>
      <div
        className={
          wide
            ? "relative"
            : "flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-neutral-800 dark:bg-black"
        }
      >
        <FiSearch
          className={wide ? "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" : "text-slate-400"}
          size={wide ? 18 : 16}
        />
        <input
          className={
            wide
              ? "h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black"
              : "w-full bg-transparent text-sm outline-none"
          }
          placeholder="Tìm theo tên, loại, dòng xe, ID..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>
    </label>
  );
}

function VehicleFilters({
  pageSize,
  searchQuery,
  setPageSize,
  setSearchQuery,
  setStatus,
  status,
}: {
  pageSize: number;
  searchQuery: string;
  setPageSize: (value: number) => void;
  setSearchQuery: (value: string) => void;
  setStatus: (value: string) => void;
  status: string;
}) {
  const pageSizeOptions = [
    { label: "6 items", value: "6" },
    { label: "8 items", value: "8" },
    { label: "12 items", value: "12" },
    { label: "24 items", value: "24" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Danh sách phương tiện</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Quản lý CRUD, thumbnail và xóa mềm theo từng nhóm phương tiện.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            buttonClassName="h-10 px-3 text-sm font-semibold"
            className="min-w-[180px]"
            label="Trạng thái"
            name="vehicle-catalog-filter-status"
            onValueChange={setStatus}
            options={[
              { label: "active", value: "active" },
              { label: "inactive", value: "inactive" },
            ]}
            placeholder="Chọn trạng thái"
            value={status}
          />
          <SelectField
            buttonClassName="h-10 px-3 text-sm font-semibold"
            label="Số item/trang"
            name="vehicle-catalog-page-size"
            onValueChange={(value) => setPageSize(Number(value))}
            options={pageSizeOptions}
            placeholder="Số item"
            value={String(pageSize)}
          />
        </div>
      </div>

      <SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} wide />
    </div>
  );
}

function VehicleCards({
  catalog,
  deletePending,
  hardDeletePending,
  emptyMessage,
  onDelete,
  onEdit,
  onHardDelete,
  onManageImage,
}: {
  catalog: InternalVehicleCatalogItem[];
  deletePending: boolean;
  hardDeletePending: boolean;
  emptyMessage: string;
  onDelete: (item: InternalVehicleCatalogItem) => void;
  onEdit: (item: InternalVehicleCatalogItem) => void;
  onHardDelete: (item: InternalVehicleCatalogItem) => void;
  onManageImage: (item: InternalVehicleCatalogItem) => void;
}) {
  if (catalog.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      {catalog.map((item, index) => (
        <article
          className="destination-card-enter overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-sky-50/40 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-neutral-800 dark:from-black dark:via-black dark:to-sky-950/10 dark:hover:shadow-black/40"
          key={item.vehicleCatalogId}
          style={{ animationDelay: `${index * 45}ms` }}
        >
          <div className="grid gap-0 md:grid-cols-[12rem_1fr]">
            <div className="relative min-h-52 bg-slate-100 dark:bg-neutral-900">
              {item.thumbnailUrl ? (
                <Image alt={item.label} className="h-full min-h-52 w-full object-cover" height={250} src={item.thumbnailUrl} width={300} />
              ) : (
                <div className="flex h-full min-h-52 items-center justify-center text-sm font-semibold text-slate-400">Chưa có ảnh</div>
              )}
              <div className="absolute left-3 top-3">
                <StatusPill value={item.status} />
              </div>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-slate-950 dark:text-neutral-50">{item.label}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                      {item.vehicleType} - {item.vehicleModel}
                    </p>
                  </div>
                  <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:border-neutral-800 dark:text-neutral-300">
                    {item.vehicleCapacity} chỗ
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 dark:text-neutral-400">
                <span className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">Loại: {item.vehicleType}</span>
                <span className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">Dòng: {item.vehicleModel || "Chưa rõ"}</span>
                <span className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">
                  <FiImage /> {item.imageUrl ? "Đã có ảnh" : "Thiếu ảnh"}
                </span>
                <span className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">Capacity {item.vehicleCapacity}</span>
              </div>

              <div className="space-y-1 text-xs text-slate-500 dark:text-neutral-500">
                {item.imageUrl ? <p>Ảnh: {imageFolderLabel(item.imageUrl)}</p> : null}
                <p>ID: {item.vehicleCatalogId}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  onClick={() => onEdit(item)}
                  type="button"
                >
                  Sửa
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  onClick={() => onManageImage(item)}
                  type="button"
                >
                  <FiImage size={14} />
                  Ảnh
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-950 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  disabled={deletePending}
                  onClick={() => onDelete(item)}
                  type="button"
                >
                  <FiTrash2 size={14} />
                  Soft delete
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  disabled={hardDeletePending}
                  onClick={() => onHardDelete(item)}
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
  );
}
