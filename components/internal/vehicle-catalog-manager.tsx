"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { FiLayers, FiPlus } from "react-icons/fi";

import { getInternalVehicleCatalogItem } from "@/lib/client/api-client";
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
  const router = useRouter();
  const manager = useVehicleCatalogManager();
  const loadedEditVehicleIdRef = useRef<string | null>(null);
  const activeTab = getActiveVehicleTab(pathname);
  const editVehicleCatalogId = extractEditVehicleCatalogId(pathname);
  const pageCopy = getVehiclePageCopy(activeTab);

  useEffect(() => {
    if (!editVehicleCatalogId || loadedEditVehicleIdRef.current === editVehicleCatalogId) {
      return;
    }

    loadedEditVehicleIdRef.current = editVehicleCatalogId;

    void getInternalVehicleCatalogItem(editVehicleCatalogId)
      .then((response) => manager.startEdit(response.catalogItem, "manage", { preserveUrl: true }))
      .catch(() => {
        loadedEditVehicleIdRef.current = null;
      });
  }, [editVehicleCatalogId, manager]);

  const handlePrimaryAction = () => {
    manager.resetForm();
    router.push(activeTab === "manage" ? "/internal/vehicle-catalog/list" : "/internal/vehicle-catalog/manage");
  };

  return (
    <div className="space-y-5">
      <InternalPageHeader
        action={
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-400 dark:text-slate-950"
            onClick={handlePrimaryAction}
            type="button"
          >
            {activeTab === "manage" ? <FiLayers size={17} /> : <FiPlus size={17} />}
            {activeTab === "manage" ? "Danh sách" : "Phương tiện mới"}
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
          isPaging={manager.isPaging}
          onDelete={manager.setPendingDeleteItem}
          onEdit={(item) => {
            manager.startEdit(item, "manage", { preserveUrl: true });
            router.push(buildEditHref(item));
          }}
          onHardDelete={manager.setPendingHardDeleteItem}
          hardDeletePending={manager.hardDeleteMutation.isPending}
          onManageImage={(item) => manager.startEdit(item, "media")}
          onJumpToPage={manager.onJumpToCatalogPage}
          onNextPage={manager.onNextCatalogPage}
          onPreviousPage={manager.onPreviousCatalogPage}
          pageSize={manager.pageSize}
          currentPage={manager.currentCatalogPage}
          hasNextPage={Boolean(manager.catalogNextCursor)}
          hasPreviousPage={manager.canGoToPreviousCatalogPage}
          searchQuery={manager.searchQuery}
          setPageSize={manager.setPageSize}
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
          isPaging={manager.isArchivedPaging}
          onHardDelete={manager.setPendingHardDeleteItem}
          onJumpToPage={manager.onJumpToArchivedCatalogPage}
          onNextPage={manager.onNextArchivedCatalogPage}
          onPreviousPage={manager.onPreviousArchivedCatalogPage}
          onRestore={manager.setPendingRestoreItem}
          pageSize={manager.archivedPageSize}
          restorePending={manager.restoreMutation.isPending}
          searchQuery={manager.archivedSearchQuery}
          setPageSize={manager.setArchivedPageSize}
          setSearchQuery={manager.setArchivedSearchQuery}
          currentPage={manager.currentArchivedCatalogPage}
          hasNextPage={Boolean(manager.archivedCatalogNextCursor)}
          hasPreviousPage={manager.canGoToPreviousArchivedCatalogPage}
        />
      ) : null}

      <VehicleCatalogModals manager={manager} />
    </div>
  );
}

function slugifyVehicleLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "vehicle";
}

function buildEditHref(item: { label: string; vehicleCatalogId: string }) {
  return `/internal/vehicle-catalog/manage/edit/${slugifyVehicleLabel(item.label)}-${item.vehicleCatalogId}`;
}

function extractEditVehicleCatalogId(pathname: string) {
  const match = pathname.match(/\/internal\/vehicle-catalog\/manage\/edit\/.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);

  return match?.[1] ?? null;
}
