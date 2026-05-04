"use client";

import dynamic from "next/dynamic";
import { FiMapPin, FiPlus } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InternalPageHeader, InternalPanel } from "./internal-primitives";
import { DestinationManagerEditor } from "./destination-manager-editor";
import { DestinationManagerList } from "./destination-manager-list";
import { DestinationManagerMedia } from "./destination-manager-media";
import { useDestinationManager } from "./use-destination-manager";

const MapLocationPicker = dynamic(
  () => import("./map-location-picker").then((module) => module.MapLocationPicker),
  { ssr: false },
);

export function DestinationManager() {
  const manager = useDestinationManager();

  return (
    <div className="space-y-5">
      <InternalPageHeader
        action={
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-400 dark:text-slate-950"
            onClick={manager.onReset}
            type="button"
          >
            <FiPlus size={17} />
            Địa điểm mới
          </button>
        }
        description="Quản lý địa điểm tour, bản đồ miễn phí, tọa độ, ảnh 4K và dữ liệu ScyllaDB cho lookup nội bộ."
        title="Quản lý địa điểm tour"
      />

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

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <DestinationManagerEditor
          archivePending={manager.archivePending}
          editingDestination={manager.editingDestination}
          errors={manager.formErrors}
          form={manager.form}
          keywordsText={manager.keywordsText}
          onArchive={manager.onArchiveCurrent}
          onReset={manager.onReset}
          onSubmit={manager.handleSubmit}
          savePending={manager.savePending}
          setForm={manager.setForm}
          setKeywordsText={manager.setKeywordsText}
        />

        <div className="space-y-5">
          <DestinationManagerMedia
            draftCreationError={manager.draftCreationError}
            deletePending={manager.deletePending}
            editingDestination={manager.editingDestination}
            isCover={manager.isCover}
            media={manager.media}
            mediaTitle={manager.mediaTitle}
            mediaType={manager.mediaType}
            onDelete={manager.onOpenDeleteMediaConfirm}
            onRetryDraft={manager.onRetryDraft}
            onSelectFile={manager.setSelectedFile}
            onSetCover={manager.onSetCover}
            onTitleChange={manager.setMediaTitle}
            onTypeChange={manager.setMediaType}
            onUpload={manager.onUpload}
            retryDraftPending={manager.isCreatingDraft}
            selectedFile={manager.selectedFile}
            setCoverPending={manager.setCoverPending}
            setIsCover={manager.setIsCover}
            uploadPending={manager.uploadPending}
          />

          <DestinationManagerList
            archivePending={manager.archivePending}
            destinations={manager.destinations}
            isLoading={manager.isLoading}
            onArchive={manager.onOpenArchiveConfirm}
            onEdit={manager.startEdit}
            setStatus={manager.setStatus}
            status={manager.status}
          />
        </div>
      </div>

      <ConfirmModal
        confirmLabel={manager.dangerAction?.kind === "delete-media" ? "Xóa ảnh" : "Lưu trữ"}
        description={
          manager.dangerAction?.kind === "delete-media"
            ? "Hành động này sẽ xóa ảnh và cập nhật lại media của địa điểm."
            : "Hành động này sẽ chuyển địa điểm sang trạng thái archived."
        }
        open={manager.dangerAction !== null}
        onCancel={() => manager.setDangerAction(null)}
        onConfirm={manager.confirmDangerAction}
        title={manager.dangerAction?.kind === "delete-media" ? "Xóa ảnh này?" : "Lưu trữ địa điểm?"}
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
    </div>
  );
}
