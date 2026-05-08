"use client";

import Image from "next/image";
import Link from "next/link";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { FiEdit3, FiImage, FiRefreshCw, FiSave, FiSearch, FiStar, FiTrash2, FiUploadCloud, FiUsers } from "react-icons/fi";

import { ImageDropzone } from "@/components/ui/image-dropzone";
import { PaginationControl } from "@/components/ui/pagination-control";
import { SelectField } from "@/components/ui/select-field";
import type { InternalServiceProvider, InternalServiceProviderMedia, ServiceProviderMutationRequest } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";
import {
  activeStatusOptions,
  contractStatusOptions,
  formatDate,
  imageFolderLabel,
  pageSizeOptions,
  serviceTypeOptions,
  tabs,
  type SelectedFilePreview,
} from "./service-provider-utils";
export function ProviderTabs({ pathname }: { pathname: string }) {
  return (
    <InternalPanel className="p-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
                active
                  ? "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-800 dark:bg-black dark:text-neutral-300 dark:hover:bg-neutral-900"
              }`}
              href={tab.href}
              key={tab.href}
            >
              <Icon size={16} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </InternalPanel>
  );
}

export function ProviderStats({ stats }: { stats: { active: number; archived: number; inactive: number; suspended: number; total: number; withImage: number } }) {
  const items = [
    { label: "Tổng", value: stats.total },
    { label: "Active", value: stats.active },
    { label: "Inactive", value: stats.inactive },
    { label: "Suspended", value: stats.suspended },
    { label: "Có ảnh", value: stats.withImage },
    { label: "Archived", value: stats.archived },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <InternalPanel className="p-4" key={item.label}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            <FiUsers size={14} />
            {item.label}
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-neutral-50">{item.value}</p>
        </InternalPanel>
      ))}
    </div>
  );
}

export function ProviderManageSection({
  editingProvider,
  form,
  formErrors,
  media,
  mediaPending,
  onDeleteMedia,
  onSelectFiles,
  onSetCover,
  onSubmit,
  resetForm,
  savePending,
  selectedFilePreviews,
  selectedFiles,
  setForm,
}: {
  editingProvider: InternalServiceProvider | null;
  form: ServiceProviderMutationRequest;
  formErrors: Partial<Record<keyof ServiceProviderMutationRequest, string>>;
  media: InternalServiceProviderMedia[];
  mediaPending: boolean;
  onDeleteMedia: (media: InternalServiceProviderMedia) => void;
  onSelectFiles: (files: File[]) => void;
  onSetCover: (media: InternalServiceProviderMedia) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  resetForm: () => void;
  savePending: boolean;
  selectedFilePreviews: SelectedFilePreview[];
  selectedFiles: File[];
  setForm: Dispatch<SetStateAction<ServiceProviderMutationRequest>>;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <InternalPanel className="p-4">
        <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">
          {editingProvider ? "Cập nhật nhà cung cấp" : "Tạo nhà cung cấp"}
        </h3>
        <form className="mt-4 grid gap-4" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              disabled={Boolean(editingProvider)}
              error={formErrors.serviceType}
              label="Loại dịch vụ"
              name="provider-service-type"
              onValueChange={(value) => setForm((current) => ({ ...current, serviceType: value }))}
              options={serviceTypeOptions}
              placeholder="Chọn loại dịch vụ"
              value={form.serviceType}
            />
            <SelectField
              error={formErrors.status}
              label="Trạng thái"
              name="provider-status"
              onValueChange={(value) => setForm((current) => ({ ...current, status: value as ServiceProviderMutationRequest["status"] }))}
              options={activeStatusOptions}
              placeholder="Chọn trạng thái"
              value={form.status}
            />
            <TextInput
              error={formErrors.providerName}
              label="Tên nhà cung cấp"
              onChange={(value) => setForm((current) => ({ ...current, providerName: value }))}
              value={form.providerName}
            />
            <TextInput
              error={formErrors.region}
              label="Khu vực"
              onChange={(value) => setForm((current) => ({ ...current, region: value }))}
              value={form.region}
            />
            <TextInput
              error={formErrors.phone}
              label="Số điện thoại"
              onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
              value={form.phone}
            />
            <TextInput
              error={formErrors.email}
              label="Email"
              onChange={(value) => setForm((current) => ({ ...current, email: value }))}
              value={form.email}
            />
            <label className="space-y-2">
              <span className="text-sm font-semibold">Xếp hạng</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black"
                max={5}
                min={0}
                step="0.1"
                type="number"
                value={form.rating}
                onChange={(event) => setForm((current) => ({ ...current, rating: Number(event.target.value) }))}
              />
              {formErrors.rating ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{formErrors.rating}</p> : null}
            </label>
            <SelectField
              error={formErrors.contractStatus}
              label="Trạng thái hợp đồng"
              name="provider-contract-status"
              onValueChange={(value) =>
                setForm((current) => ({ ...current, contractStatus: value as ServiceProviderMutationRequest["contractStatus"] }))
              }
              options={contractStatusOptions}
              placeholder="Chọn trạng thái"
              value={form.contractStatus}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={savePending}
              type="submit"
            >
              <FiSave size={17} />
              {selectedFiles.length > 0 ? `Lưu và upload ${selectedFiles.length} ảnh` : "Lưu nhà cung cấp"}
            </button>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
              onClick={resetForm}
              type="button"
            >
              Làm mới
            </button>
          </div>
        </form>
      </InternalPanel>

      <ProviderImagePanel
        disabled={savePending}
        media={media}
        mediaPending={mediaPending}
        onDeleteMedia={onDeleteMedia}
        onSelectFiles={onSelectFiles}
        onSetCover={onSetCover}
        provider={editingProvider}
        selectedFilePreviews={selectedFilePreviews}
        selectedFiles={selectedFiles}
      />
    </div>
  );
}

function TextInput({
  error,
  label,
  onChange,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <input
        className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none transition dark:bg-black ${
          error ? "border-rose-300 focus:border-rose-500 dark:border-rose-900" : "border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800"
        }`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{error}</p> : null}
    </label>
  );
}

export function ProviderListSection({
  archivePending,
  currentPage,
  hardDeletePending,
  hasNextPage,
  hasPreviousPage,
  isLoading,
  isPaging,
  onArchive,
  onEdit,
  onHardDelete,
  onJumpToPage,
  onManageImage,
  onNextPage,
  onPreviousPage,
  pageSize,
  providers,
  searchQuery,
  serviceType,
  setPageSize,
  setSearchQuery,
  setServiceType,
  setStatus,
  status,
}: {
  archivePending: boolean;
  currentPage: number;
  hardDeletePending: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  isPaging: boolean;
  onArchive: (provider: InternalServiceProvider) => void;
  onEdit: (provider: InternalServiceProvider) => void;
  onHardDelete: (provider: InternalServiceProvider) => void;
  onJumpToPage: (page: number) => void;
  onManageImage: (provider: InternalServiceProvider) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pageSize: number;
  providers: InternalServiceProvider[];
  searchQuery: string;
  serviceType: string;
  setPageSize: (value: number) => void;
  setSearchQuery: (value: string) => void;
  setServiceType: (value: string) => void;
  setStatus: (value: string) => void;
  status: string;
}) {
  return (
    <InternalPanel className="p-4">
      <ProviderFilters
        pageSize={pageSize}
        searchQuery={searchQuery}
        serviceType={serviceType}
        setPageSize={setPageSize}
        setSearchQuery={setSearchQuery}
        setServiceType={setServiceType}
        setStatus={setStatus}
        showStatus
        status={status}
      />
      <ProviderCards
        archivePending={archivePending}
        hardDeletePending={hardDeletePending}
        providers={providers}
        emptyMessage={isLoading || isPaging ? "Đang tải nhà cung cấp..." : "Không tìm thấy nhà cung cấp phù hợp."}
        onArchive={onArchive}
        onEdit={onEdit}
        onHardDelete={onHardDelete}
        onManageImage={onManageImage}
      />
      <ProviderPagination
        currentPage={currentPage}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        isPaging={isPaging}
        itemLabel="nhà cung cấp"
        onJumpToPage={onJumpToPage}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
        pageSize={pageSize}
        visible={providers.length > 0}
      />
    </InternalPanel>
  );
}

export function ProviderArchivedSection({
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
  providers,
  restorePending,
  searchQuery,
  serviceType,
  setPageSize,
  setSearchQuery,
  setServiceType,
}: {
  currentPage: number;
  hardDeletePending: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  isPaging: boolean;
  onHardDelete: (provider: InternalServiceProvider) => void;
  onJumpToPage: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onRestore: (provider: InternalServiceProvider) => void;
  pageSize: number;
  providers: InternalServiceProvider[];
  restorePending: boolean;
  searchQuery: string;
  serviceType: string;
  setPageSize: (value: number) => void;
  setSearchQuery: (value: string) => void;
  setServiceType: (value: string) => void;
}) {
  return (
    <InternalPanel className="p-4">
      <ProviderFilters
        pageSize={pageSize}
        searchQuery={searchQuery}
        serviceType={serviceType}
        setPageSize={setPageSize}
        setSearchQuery={setSearchQuery}
        setServiceType={setServiceType}
      />
      {providers.length === 0 ? (
        <div className="mt-4">
          <EmptyState message={isLoading || isPaging ? "Đang tải archived..." : "Không tìm thấy provider archived phù hợp."} />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {providers.map((provider) => (
            <ProviderCard
              archived
              hardDeletePending={hardDeletePending}
              key={provider.providerId}
              onHardDelete={onHardDelete}
              onRestore={onRestore}
              provider={provider}
              restorePending={restorePending}
            />
          ))}
        </div>
      )}
      <ProviderPagination
        currentPage={currentPage}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        isPaging={isPaging}
        itemLabel="provider archived"
        onJumpToPage={onJumpToPage}
        onNextPage={onNextPage}
        onPreviousPage={onPreviousPage}
        pageSize={pageSize}
        visible={providers.length > 0}
      />
    </InternalPanel>
  );
}

export function ProviderMediaSection({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  isLoading,
  isPaging,
  media,
  mediaPending,
  mediaTarget,
  onDeleteMedia,
  onJumpToPage,
  onNextPage,
  onPreviousPage,
  onSelectFiles,
  onSelectProvider,
  onSetCover,
  onUpload,
  pageSize,
  providers,
  searchQuery,
  selectedFilePreviews,
  selectedFiles,
  serviceType,
  setPageSize,
  setSearchQuery,
  setServiceType,
  setStatus,
  status,
  uploadPending,
}: {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  isPaging: boolean;
  media: InternalServiceProviderMedia[];
  mediaPending: boolean;
  mediaTarget: InternalServiceProvider | null;
  onDeleteMedia: (media: InternalServiceProviderMedia) => void;
  onJumpToPage: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onSelectFiles: (files: File[]) => void;
  onSelectProvider: (provider: InternalServiceProvider) => void;
  onSetCover: (media: InternalServiceProviderMedia) => void;
  onUpload: () => void;
  pageSize: number;
  providers: InternalServiceProvider[];
  searchQuery: string;
  selectedFilePreviews: SelectedFilePreview[];
  selectedFiles: File[];
  serviceType: string;
  setPageSize: (value: number) => void;
  setSearchQuery: (value: string) => void;
  setServiceType: (value: string) => void;
  setStatus: (value: string) => void;
  status: string;
  uploadPending: boolean;
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <InternalPanel className="p-4">
        <ProviderFilters
          pageSize={pageSize}
          searchQuery={searchQuery}
          serviceType={serviceType}
          setPageSize={setPageSize}
          setSearchQuery={setSearchQuery}
          setServiceType={setServiceType}
          setStatus={setStatus}
          showStatus
          status={status}
        />
        <div className="mt-4 space-y-3">
          {providers.length === 0 ? (
            <EmptyState message={isLoading || isPaging ? "Đang tải provider..." : "Không tìm thấy provider để quản lý ảnh."} />
          ) : (
            providers.map((provider) => (
              <button
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                  mediaTarget?.providerId === provider.providerId
                    ? "border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30"
                    : "border-slate-200 bg-white hover:bg-slate-50 dark:border-neutral-800 dark:bg-black dark:hover:bg-neutral-900"
                }`}
                key={provider.providerId}
                onClick={() => onSelectProvider(provider)}
                type="button"
              >
                <ProviderThumb provider={provider} size="small" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">{provider.providerName}</span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-neutral-400">{provider.region}</span>
                </span>
              </button>
            ))
          )}
        </div>
        <ProviderPagination
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          isPaging={isPaging}
          itemLabel="provider"
          onJumpToPage={onJumpToPage}
          onNextPage={onNextPage}
          onPreviousPage={onPreviousPage}
          pageSize={pageSize}
          visible={providers.length > 0}
        />
      </InternalPanel>

      <ProviderImagePanel
        disabled={uploadPending || !mediaTarget}
        media={media}
        mediaPending={mediaPending}
        onDeleteMedia={onDeleteMedia}
        onSelectFiles={onSelectFiles}
        onSetCover={onSetCover}
        onUpload={onUpload}
        provider={mediaTarget}
        selectedFilePreviews={selectedFilePreviews}
        selectedFiles={selectedFiles}
        uploadPending={uploadPending}
      />
    </div>
  );
}

function ProviderFilters({
  pageSize,
  searchQuery,
  serviceType,
  setPageSize,
  setSearchQuery,
  setServiceType,
  setStatus,
  showStatus = false,
  status,
}: {
  pageSize: number;
  searchQuery: string;
  serviceType: string;
  setPageSize: (value: number) => void;
  setSearchQuery: (value: string) => void;
  setServiceType: (value: string) => void;
  setStatus?: (value: string) => void;
  showStatus?: boolean;
  status?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <SelectField
          buttonClassName="h-10 px-3 text-sm font-semibold"
          label="Loại dịch vụ"
          name="provider-filter-service-type"
          onValueChange={setServiceType}
          options={serviceTypeOptions}
          placeholder="Chọn loại"
          value={serviceType}
        />
        {showStatus && setStatus ? (
          <SelectField
            buttonClassName="h-10 px-3 text-sm font-semibold"
            label="Trạng thái"
            name="provider-filter-status"
            onValueChange={setStatus}
            options={activeStatusOptions}
            placeholder="Chọn trạng thái"
            value={status}
          />
        ) : null}
        <SelectField
          buttonClassName="h-10 px-3 text-sm font-semibold"
          label="Số item/trang"
          name="provider-page-size"
          onValueChange={(value) => setPageSize(Number(value))}
          options={pageSizeOptions}
          placeholder="Số item"
          value={String(pageSize)}
        />
      </div>

      <label className="relative block">
        <span className="sr-only">Tìm kiếm nhà cung cấp</span>
        <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-medium outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm theo tên, khu vực, email, số điện thoại, ID..."
          value={searchQuery}
        />
      </label>
    </div>
  );
}

function ProviderCards({
  archivePending,
  emptyMessage,
  hardDeletePending,
  onArchive,
  onEdit,
  onHardDelete,
  onManageImage,
  providers,
}: {
  archivePending: boolean;
  emptyMessage: string;
  hardDeletePending: boolean;
  onArchive: (provider: InternalServiceProvider) => void;
  onEdit: (provider: InternalServiceProvider) => void;
  onHardDelete: (provider: InternalServiceProvider) => void;
  onManageImage: (provider: InternalServiceProvider) => void;
  providers: InternalServiceProvider[];
}) {
  if (providers.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState message={emptyMessage} />
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      {providers.map((provider) => (
        <ProviderCard
          archivePending={archivePending}
          hardDeletePending={hardDeletePending}
          key={provider.providerId}
          onArchive={onArchive}
          onEdit={onEdit}
          onHardDelete={onHardDelete}
          onManageImage={onManageImage}
          provider={provider}
        />
      ))}
    </div>
  );
}

function ProviderCard({
  archivePending,
  archived = false,
  hardDeletePending,
  onArchive,
  onEdit,
  onHardDelete,
  onManageImage,
  onRestore,
  provider,
  restorePending = false,
}: {
  archivePending?: boolean;
  archived?: boolean;
  hardDeletePending: boolean;
  onArchive?: (provider: InternalServiceProvider) => void;
  onEdit?: (provider: InternalServiceProvider) => void;
  onHardDelete: (provider: InternalServiceProvider) => void;
  onManageImage?: (provider: InternalServiceProvider) => void;
  onRestore?: (provider: InternalServiceProvider) => void;
  provider: InternalServiceProvider;
  restorePending?: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/70 dark:border-neutral-800 dark:bg-black dark:hover:shadow-black/40">
      <div className="grid gap-0 md:grid-cols-[12rem_1fr]">
        <ProviderThumb provider={provider} />
        <div className="space-y-4 p-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-slate-950 dark:text-neutral-50">{provider.providerName}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                  {provider.serviceType} - {provider.region}
                </p>
              </div>
              <StatusPill value={provider.status} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600 dark:text-neutral-400">
            <span className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">Hợp đồng: {provider.contractStatus}</span>
            <span className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">Rating {provider.rating.toFixed(1)}</span>
            <span className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">{provider.email}</span>
            <span className="rounded-xl bg-slate-100 px-3 py-2 dark:bg-neutral-900">{provider.phone}</span>
          </div>
          <div className="space-y-1 text-xs text-slate-500 dark:text-neutral-500">
            {provider.imageUrl ? <p>Ảnh: {imageFolderLabel(provider.imageUrl)}</p> : <p>Chưa có ảnh đại diện.</p>}
            {archived && provider.archivedAt ? <p>Lưu trữ: {formatDate(provider.archivedAt)}</p> : null}
            <p>ID: {provider.providerId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {archived ? (
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                disabled={restorePending}
                onClick={() => onRestore?.(provider)}
                type="button"
              >
                <FiRefreshCw size={14} />
                Restore
              </button>
            ) : (
              <>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  onClick={() => onEdit?.(provider)}
                  type="button"
                >
                  <FiEdit3 size={14} />
                  Sửa
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                  onClick={() => onManageImage?.(provider)}
                  type="button"
                >
                  <FiImage size={14} />
                  Ảnh
                </button>
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-950 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  disabled={archivePending}
                  onClick={() => onArchive?.(provider)}
                  type="button"
                >
                  <FiTrash2 size={14} />
                  Soft delete
                </button>
              </>
            )}
            <button
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
              disabled={hardDeletePending}
              onClick={() => onHardDelete(provider)}
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
}

function ProviderThumb({ provider, size = "card" }: { provider: InternalServiceProvider; size?: "card" | "small" }) {
  if (size === "small") {
    return (
      <span className="relative flex h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100 dark:bg-neutral-900">
        {provider.thumbnailUrl ? (
          <Image alt={provider.providerName} className="object-cover" fill sizes="48px" src={provider.thumbnailUrl} />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-400">
            <FiImage size={18} />
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="relative min-h-52 bg-slate-100 dark:bg-neutral-900">
      {provider.thumbnailUrl ? (
        <Image alt={provider.providerName} className="h-full min-h-52 w-full object-cover" height={250} src={provider.thumbnailUrl} width={300} />
      ) : (
        <div className="flex h-full min-h-52 items-center justify-center text-sm font-semibold text-slate-400">Chưa có ảnh</div>
      )}
      <div className="absolute left-3 top-3">
        <StatusPill value={provider.status} />
      </div>
    </div>
  );
}

function ProviderImagePanel({
  disabled,
  media,
  mediaPending,
  onDeleteMedia,
  onSelectFiles,
  onSetCover,
  onUpload,
  provider,
  selectedFilePreviews,
  selectedFiles,
  uploadPending = false,
}: {
  disabled: boolean;
  media: InternalServiceProviderMedia[];
  mediaPending: boolean;
  onDeleteMedia: (media: InternalServiceProviderMedia) => void;
  onSelectFiles: (files: File[]) => void;
  onSetCover: (media: InternalServiceProviderMedia) => void;
  onUpload?: () => void;
  provider: InternalServiceProvider | null;
  selectedFilePreviews: SelectedFilePreview[];
  selectedFiles: File[];
  uploadPending?: boolean;
}) {
  return (
    <InternalPanel className="p-4">
      <div className="flex items-center gap-2">
        <FiImage className="text-slate-400" size={16} />
        <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">
          {provider ? `Ảnh của ${provider.providerName}` : "Chọn nhà cung cấp để quản lý ảnh"}
        </h3>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
        Ảnh upload được chuẩn hóa và tạo thumbnail giống các kho media nội bộ khác.
      </p>

      <div className="mt-4 space-y-4">
        {selectedFilePreviews.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {selectedFilePreviews.map((item) => (
              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800" key={`${item.file.name}-${item.previewUrl}`}>
                <div className="relative aspect-video bg-slate-100 dark:bg-neutral-900">
                  <Image alt={item.file.name} className="object-cover" fill sizes="(min-width: 768px) 22vw, 100vw" src={item.previewUrl} />
                </div>
                <p className="truncate p-2 text-xs font-semibold text-slate-600 dark:text-neutral-400">{item.file.name}</p>
              </div>
            ))}
          </div>
        ) : null}

        <ProviderMediaGallery media={media} mediaPending={mediaPending} onDeleteMedia={onDeleteMedia} onSetCover={onSetCover} />

        <ImageDropzone
          disabled={disabled}
          file={selectedFiles}
          label="Chọn ảnh nhà cung cấp"
          multiple
          onFileChange={(file) => onSelectFiles(file ? [file] : [])}
          onFilesChange={onSelectFiles}
        />

        {onUpload ? (
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950"
            disabled={disabled || selectedFiles.length === 0 || uploadPending}
            onClick={onUpload}
            type="button"
          >
            <FiUploadCloud size={17} />
            Upload {selectedFiles.length > 0 ? `${selectedFiles.length} ảnh` : "ảnh"}
          </button>
        ) : null}
      </div>
    </InternalPanel>
  );
}

function ProviderMediaGallery({
  media,
  mediaPending,
  onDeleteMedia,
  onSetCover,
}: {
  media: InternalServiceProviderMedia[];
  mediaPending: boolean;
  onDeleteMedia: (media: InternalServiceProviderMedia) => void;
  onSetCover: (media: InternalServiceProviderMedia) => void;
}) {
  if (mediaPending) {
    return <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-neutral-800">Đang tải gallery...</div>;
  }

  if (media.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm font-semibold text-slate-400 dark:border-neutral-800">
        Chưa có ảnh trong gallery.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {media.map((item) => (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-neutral-800" key={item.mediaId}>
          <div className="relative aspect-video bg-slate-100 dark:bg-neutral-900">
            <Image alt={item.title ?? "Ảnh nhà cung cấp"} className="object-cover" fill sizes="(min-width: 768px) 22vw, 100vw" src={item.thumbnailUrl} />
            {item.isCover ? (
              <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white">
                <FiStar size={12} />
                Cover
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 p-2">
            <button
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2 text-xs font-semibold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-800 dark:hover:bg-neutral-900"
              disabled={item.isCover}
              onClick={() => onSetCover(item)}
              type="button"
            >
              <FiStar size={13} />
              Đặt cover
            </button>
            <button
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-rose-200 px-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
              onClick={() => onDeleteMedia(item)}
              type="button"
            >
              <FiTrash2 size={13} />
              Xóa
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProviderPagination({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  isPaging,
  itemLabel,
  onJumpToPage,
  onNextPage,
  onPreviousPage,
  pageSize,
  visible,
}: {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isPaging: boolean;
  itemLabel: string;
  onJumpToPage: (page: number) => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
  pageSize: number;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-neutral-800">
      <PaginationControl
        canGoNext={hasNextPage}
        canGoPrevious={hasPreviousPage}
        currentPage={currentPage}
        disabled={isPaging}
        itemLabel={itemLabel}
        onGoNext={onNextPage}
        onGoPrevious={onPreviousPage}
        onPageSubmit={onJumpToPage}
        pageSize={pageSize}
      />
    </div>
  );
}
