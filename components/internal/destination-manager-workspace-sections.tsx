"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { FiArchive, FiLayers, FiMapPin } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";

import { DestinationManagerArchivedList } from "./destination-manager-archived-list";
import { DestinationManagerEditor } from "./destination-manager-editor";
import { DestinationManagerList } from "./destination-manager-list";
import { DestinationManagerMedia } from "./destination-manager-media";
import { InternalPanel } from "./internal-primitives";
import type { useDestinationManager } from "./use-destination-manager";

const MapLocationPicker = dynamic(
  () => import("./map-location-picker").then((module) => module.MapLocationPicker),
  { ssr: false },
);

type DestinationManagerState = ReturnType<typeof useDestinationManager>;

export const destinationTabs = [
  {
    href: "/internal/destinations/manage",
    icon: FiMapPin,
    label: "Tạo + Preview",
  },
  {
    href: "/internal/destinations/list",
    icon: FiLayers,
    label: "Danh sách",
  },
  {
    href: "/internal/destinations/archived",
    icon: FiArchive,
    label: "Archived",
  },
] as const;

export function DestinationWorkspaceTabs({ pathname }: { pathname: string }) {
  return (
    <InternalPanel className="p-3">
      <div className="flex flex-wrap gap-2">
        {destinationTabs.map((tab) => {
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

export function DestinationManageSection({ manager }: { manager: DestinationManagerState }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
      <div className="space-y-5">
        <InternalPanel className="p-4">
          <div className="flex items-center gap-2">
            <FiMapPin className="text-sky-600 dark:text-sky-300" size={18} />
            <div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Chọn vị trí trên bản đồ</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                Chọn tọa độ trước, phần còn lại của địa điểm sẽ được điền tự động.
              </p>
            </div>
          </div>
          <div className="mt-4">
            <MapLocationPicker latitude={manager.form.latitude} longitude={manager.form.longitude} onSelect={manager.handleMapSelect} />
          </div>
        </InternalPanel>

        <DestinationManagerEditor
          archivePending={manager.archivePending}
          editingDestination={manager.editingDestination}
          errors={manager.formErrors}
          form={manager.form}
          keywordsText={manager.keywordsText}
          onReset={manager.onReset}
          onSaveAsStatus={manager.onSaveAsStatus}
          onSubmit={manager.handleSubmit}
          savePending={manager.savePending}
          setForm={manager.setForm}
          setKeywordsText={manager.setKeywordsText}
        />
      </div>

      <DestinationManagerMedia
        destinationStatus={manager.editingDestination?.status ?? null}
        draftCreationError={manager.draftCreationError}
        deletePending={manager.deletePending}
        draftMediaItems={manager.draftMediaItems}
        editingDestination={manager.editingDestination}
        isCover={manager.isCover}
        media={manager.media}
        mediaTitle={manager.mediaTitle}
        mediaType={manager.mediaType}
        onAddDraftMediaItems={manager.onAddDraftMediaItems}
        onClearDraftMediaItems={manager.onClearDraftMediaItems}
        onDelete={manager.onOpenDeleteMediaConfirm}
        onRemoveDraftMediaItem={manager.onRemoveDraftMediaItem}
        onRetryDraft={manager.onRetryDraft}
        onSelectFile={manager.setSelectedFile}
        onSetCover={manager.onSetCover}
        onSetDraftMediaCover={manager.onSetDraftMediaCover}
        onTitleChange={manager.setMediaTitle}
        onTypeChange={manager.setMediaType}
        onUpload={manager.onUpload}
        retryDraftPending={manager.isCreatingDraft}
        selectedFile={manager.selectedFile}
        selectedFilePreviewUrl={manager.selectedFilePreviewUrl}
        setCoverPending={manager.setCoverPending}
        setIsCover={manager.setIsCover}
        uploadPending={manager.uploadPending}
      />
    </div>
  );
}

export function DestinationListSection({
  manager,
  onEdit,
}: {
  manager: DestinationManagerState;
  onEdit: (destination: DestinationManagerState["destinations"][number]) => void;
}) {
  return (
    <DestinationManagerList
      archivePending={manager.archivePending}
      currentPage={manager.currentDestinationsPage}
      destinations={manager.destinations}
      hardDeletePending={manager.hardDeletePending}
      hasNextPage={Boolean(manager.destinationsNextCursor)}
      hasPreviousPage={manager.canGoToPreviousDestinationsPage}
      isLoading={manager.isLoading}
      isPaging={manager.isPaging}
      onArchive={manager.onOpenArchiveConfirm}
      onEdit={onEdit}
      onHardDelete={manager.onOpenHardDeleteConfirm}
      onJumpToPage={manager.onJumpToDestinationsPage}
      onNextPage={manager.onNextDestinationsPage}
      onPreviousPage={manager.onPreviousDestinationsPage}
      onPublish={(destination) => manager.onChangeDestinationStatus(destination, "published")}
      pageSize={manager.pageSize}
      pendingCoverImageDestinationId={manager.editingDestination?.destinationId ?? null}
      pendingCoverImageUrl={manager.selectedFilePreviewUrl}
      searchQuery={manager.searchQuery}
      setPageSize={manager.setPageSize}
      setSearchQuery={manager.setSearchQuery}
      setStatus={manager.setStatus}
      status={manager.status}
    />
  );
}

export function DestinationArchivedSection({ manager }: { manager: DestinationManagerState }) {
  return (
    <div className="space-y-5">
      <DestinationManagerArchivedList
        currentPage={manager.currentArchivedDestinationsPage}
        destinations={manager.archivedDestinations}
        hardDeletePending={manager.hardDeletePending}
        hasNextPage={Boolean(manager.archivedDestinationsNextCursor)}
        hasPreviousPage={manager.canGoToPreviousArchivedDestinationsPage}
        isLoading={manager.isArchivedLoading}
        isPaging={manager.isArchivedPaging}
        onHardDelete={manager.onOpenHardDeleteConfirm}
        onJumpToPage={manager.onJumpToArchivedDestinationsPage}
        onNextPage={manager.onNextArchivedDestinationsPage}
        onPreviousPage={manager.onPreviousArchivedDestinationsPage}
        onRestore={manager.onOpenRestoreConfirm}
        pageSize={manager.archivedPageSize}
        restorePending={manager.restorePending}
        searchQuery={manager.archivedSearchQuery}
        setPageSize={manager.setArchivedPageSize}
        setSearchQuery={manager.setArchivedSearchQuery}
      />
    </div>
  );
}

export function DestinationWorkspaceModals({ manager }: { manager: DestinationManagerState }) {
  return (
    <>
      <ConfirmModal
        confirmLabel={
          manager.dangerAction?.kind === "delete-media"
            ? "Xóa ảnh"
            : manager.dangerAction?.kind === "restore"
              ? "Khôi phục"
              : manager.dangerAction?.kind === "hard-delete"
                ? "Xóa vĩnh viễn"
                : "Lưu trữ"
        }
        description={
          manager.dangerAction?.kind === "delete-media"
            ? "Hành động này sẽ xóa ảnh và cập nhật lại media của địa điểm."
            : manager.dangerAction?.kind === "restore"
              ? "Địa điểm archived sẽ được khôi phục về draft để kiểm tra lại."
              : manager.dangerAction?.kind === "hard-delete"
                ? "Hành động này xóa vĩnh viễn địa điểm, media và các file ảnh đã lưu. Không thể khôi phục."
                : "Hành động này sẽ chuyển địa điểm sang trạng thái archived."
        }
        open={manager.dangerAction !== null}
        onCancel={() => manager.setDangerAction(null)}
        onConfirm={manager.confirmDangerAction}
        title={
          manager.dangerAction?.kind === "delete-media"
            ? "Xóa ảnh này?"
            : manager.dangerAction?.kind === "restore"
              ? "Khôi phục địa điểm?"
              : manager.dangerAction?.kind === "hard-delete"
                ? "Xóa vĩnh viễn địa điểm?"
                : "Lưu trữ địa điểm?"
        }
      />

      <ConfirmModal
        cancelLabel="Đóng"
        confirmLabel={manager.isCreatingDraft ? "Đang thử..." : "Thử lại"}
        description={
          manager.draftCreationError
            ? `${manager.draftCreationError.message}${manager.draftCreationError.details ? `\n${manager.draftCreationError.details}` : ""}`
            : "Không thể tạo nháp từ vị trí đã chọn."
        }
        open={manager.draftCreationError !== null}
        onCancel={() => manager.setDraftCreationError(null)}
        onConfirm={manager.onRetryDraft}
        title="Tạo nháp chưa thành công"
      />
    </>
  );
}
