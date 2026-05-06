"use client";

import { usePathname } from "next/navigation";
import { FiPlus } from "react-icons/fi";

import { InternalPageHeader } from "./internal-primitives";
import { useVehicleCatalogManager } from "./use-vehicle-catalog-manager";
import {
  getActiveVehicleTab,
  getVehiclePageCopy,
  VehicleCatalogModals,
  VehicleCatalogStats,
  VehicleListSection,
  VehicleManageSection,
  VehicleMediaSection,
  VehicleWorkspaceTabs,
} from "./vehicle-catalog-manager-sections";

export function VehicleCatalogManager() {
  const pathname = usePathname();
  const manager = useVehicleCatalogManager();
  const activeTab = getActiveVehicleTab(pathname);
  const pageCopy = getVehiclePageCopy(activeTab);

  return (
    <div className="space-y-5">
      <InternalPageHeader
        action={
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-400 dark:text-slate-950"
            onClick={manager.resetForm}
            type="button"
          >
            <FiPlus size={17} />
            Phương tiện mới
          </button>
        }
        description={pageCopy.description}
        title={pageCopy.title}
      />

      <VehicleWorkspaceTabs pathname={pathname} />
      <VehicleCatalogStats stats={manager.stats} />

      {activeTab === "manage" ? (
        <VehicleManageSection
          editingItem={manager.editingItem}
          form={manager.form}
          formErrors={manager.formErrors}
          media={manager.media}
          mediaPending={manager.mediaQuery.isLoading}
          onDeleteMedia={manager.setPendingDeleteMedia}
          onSelectFile={manager.setSelectedFile}
          onSelectFiles={manager.setSelectedFiles}
          onSetCover={(media) => manager.setCoverMutation.mutate(media)}
          onSubmit={manager.handleSubmit}
          resetForm={manager.resetForm}
          savePending={manager.saveMutation.isPending}
          selectedFilePreviews={manager.selectedFilePreviews}
          selectedFiles={manager.selectedFiles}
          setForm={manager.setForm}
        />
      ) : null}

      {activeTab === "list" ? (
        <VehicleListSection
          catalog={manager.visibleCatalog}
          deletePending={manager.deleteMutation.isPending}
          isLoading={manager.catalogQuery.isLoading}
          onDelete={manager.setPendingDeleteItem}
          onEdit={(item) => manager.startEdit(item, "manage")}
          onManageImage={(item) => manager.startEdit(item, "media")}
          searchQuery={manager.searchQuery}
          setSearchQuery={manager.setSearchQuery}
          setStatus={manager.setStatus}
          status={manager.status}
        />
      ) : null}

      {activeTab === "media" ? (
        <VehicleMediaSection
          catalog={manager.visibleArchivedCatalog}
          hardDeletePending={manager.hardDeleteMutation.isPending}
          isLoading={manager.archivedCatalogQuery.isLoading}
          onHardDelete={manager.setPendingHardDeleteItem}
          onRestore={manager.setPendingRestoreItem}
          restorePending={manager.restoreMutation.isPending}
          searchQuery={manager.searchQuery}
          setSearchQuery={manager.setSearchQuery}
        />
      ) : null}

      <VehicleCatalogModals manager={manager} />
    </div>
  );
}
