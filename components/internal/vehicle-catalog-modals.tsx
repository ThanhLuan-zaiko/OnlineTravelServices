"use client";

import { ConfirmModal } from "@/components/ui/confirm-modal";

import type { VehicleCatalogManagerState } from "./vehicle-catalog-types";

export function VehicleCatalogModals({ manager }: { manager: VehicleCatalogManagerState }) {
  return (
    <>
      <ConfirmModal
        confirmLabel="Lưu trữ"
        description="Phương tiện sẽ được xóa mềm khỏi danh sách và chuyển sang Kho ảnh để có thể khôi phục."
        open={manager.pendingDeleteItem !== null}
        onCancel={() => manager.setPendingDeleteItem(null)}
        onConfirm={() => {
          if (manager.pendingDeleteItem) {
            manager.deleteMutation.mutate(manager.pendingDeleteItem);
          }
        }}
        title="Lưu trữ phương tiện?"
      />

      <ConfirmModal
        confirmLabel="Xóa ảnh"
        description="Ảnh phương tiện sẽ bị xóa khỏi storage và không thể hoàn tác."
        open={manager.pendingDeleteMedia !== null}
        onCancel={() => manager.setPendingDeleteMedia(null)}
        onConfirm={() => {
          if (manager.pendingDeleteMedia) {
            manager.deleteMediaMutation.mutate(manager.pendingDeleteMedia);
          }
        }}
        title="Xóa ảnh phương tiện?"
      />

      <ConfirmModal
        confirmLabel="Khôi phục"
        description="Phương tiện sẽ quay lại danh sách với trạng thái trước khi lưu trữ."
        open={manager.pendingRestoreItem !== null}
        onCancel={() => manager.setPendingRestoreItem(null)}
        onConfirm={() => {
          if (manager.pendingRestoreItem) {
            manager.restoreMutation.mutate(manager.pendingRestoreItem);
          }
        }}
        title="Khôi phục phương tiện?"
      />

      <ConfirmModal
        confirmLabel="Xóa vĩnh viễn"
        description="Phương tiện, metadata ảnh và toàn bộ file ảnh vật lý sẽ bị xóa khỏi hệ thống. Thao tác này không thể hoàn tác."
        open={manager.pendingHardDeleteItem !== null}
        onCancel={() => manager.setPendingHardDeleteItem(null)}
        onConfirm={() => {
          if (manager.pendingHardDeleteItem) {
            manager.hardDeleteMutation.mutate(manager.pendingHardDeleteItem);
          }
        }}
        title="Xóa vĩnh viễn phương tiện?"
      />
    </>
  );
}
