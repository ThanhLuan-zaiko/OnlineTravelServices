"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { FiLayers, FiPlus } from "react-icons/fi";

import { getInternalDestination } from "@/lib/client/api-client";

import { InternalPageHeader } from "./internal-primitives";
import {
  DestinationArchivedSection,
  DestinationListSection,
  DestinationManageSection,
  DestinationWorkspaceModals,
  DestinationWorkspaceTabs,
} from "./destination-manager-workspace-sections";
import { useDestinationManager } from "./use-destination-manager";

function getActiveTab(pathname: string) {
  if (pathname.startsWith("/internal/destinations/list")) {
    return "list";
  }

  if (pathname.startsWith("/internal/destinations/archived")) {
    return "archived";
  }

  return "manage";
}

function slugifyDestinationName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "destination";
}

function buildEditHref(destination: { destinationId: string; name: string }) {
  return `/internal/destinations/manage/edit/${slugifyDestinationName(destination.name)}-${destination.destinationId}`;
}

function extractEditDestinationId(pathname: string) {
  const match = pathname.match(/\/internal\/destinations\/manage\/edit\/.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);

  return match?.[1] ?? null;
}

function getPageCopy(activeTab: "archived" | "list" | "manage") {
  if (activeTab === "list") {
    return {
      description: "Duyệt danh sách theo từng trang riêng để quản lý dễ hơn.",
      title: "Danh sách địa điểm",
    };
  }

  if (activeTab === "archived") {
    return {
      description: "Khôi phục địa điểm archived về draft để kiểm tra lại trước khi publish.",
      title: "Địa điểm đã lưu trữ",
    };
  }

  return {
    description: "Preview đầy đủ trên UI trước, chỉ lưu draft DB hoặc publish khi bạn bấm hành động lưu.",
    title: "Tạo địa điểm và preview ảnh nháp",
  };
}

export function DestinationManagerWorkspace() {
  const manager = useDestinationManager();
  const pathname = usePathname();
  const router = useRouter();
  const loadedEditDestinationIdRef = useRef<string | null>(null);
  const activeTab = getActiveTab(pathname);
  const editDestinationId = extractEditDestinationId(pathname);
  const pageCopy = getPageCopy(activeTab);

  useEffect(() => {
    if (!editDestinationId || loadedEditDestinationIdRef.current === editDestinationId) {
      return;
    }

    loadedEditDestinationIdRef.current = editDestinationId;

    void getInternalDestination(editDestinationId)
      .then((response) => manager.startEdit(response.destination))
      .catch(() => {
        loadedEditDestinationIdRef.current = null;
      });
  }, [editDestinationId, manager]);

  const handlePrimaryAction = () => {
    manager.onReset();
    router.push(activeTab === "manage" ? "/internal/destinations/list" : "/internal/destinations/manage");
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
            {activeTab === "manage" ? "Danh sách" : "Địa điểm mới"}
          </button>
        }
        description={pageCopy.description}
        title={pageCopy.title}
      />

      <DestinationWorkspaceTabs pathname={pathname} />

      {activeTab === "manage" ? <DestinationManageSection manager={manager} /> : null}
      {activeTab === "list" ? (
        <DestinationListSection
          manager={manager}
          onEdit={(destination) => {
            manager.startEdit(destination);
            router.push(buildEditHref(destination));
          }}
        />
      ) : null}
      {activeTab === "archived" ? <DestinationArchivedSection manager={manager} /> : null}

      <DestinationWorkspaceModals manager={manager} />
    </div>
  );
}
