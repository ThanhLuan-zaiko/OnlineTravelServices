"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FiGrid, FiPlus } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import {
  createInternalServiceProvider,
  deleteInternalServiceProvider,
  deleteInternalServiceProviderMedia,
  getInternalServiceProvider,
  getInternalServiceProviderMedia,
  getInternalServiceProviderPage,
  getInternalServiceProviders,
  hardDeleteInternalServiceProvider,
  restoreInternalServiceProvider,
  setInternalServiceProviderMediaCover,
  updateInternalServiceProvider,
  uploadInternalServiceProviderMedia,
  type ApiError,
} from "@/lib/client/api-client";
import {
  serviceProviderMutationSchema,
  type InternalServiceProvider,
  type InternalServiceProviderMedia,
  type ServiceProviderMutationRequest,
} from "@/lib/shared/internal";

import { InternalPageHeader } from "./internal-primitives";
import {
  ProviderArchivedSection,
  ProviderListSection,
  ProviderManageSection,
  ProviderMediaSection,
  ProviderStats,
  ProviderTabs,
} from "./service-provider-sections";
import {
  buildEditHref,
  buildForm,
  defaultServiceType,
  extractEditProvider,
  getActiveTab,
  getPageCopy,
  initialForm,
  toValidationErrors,
  type DangerAction,
  type SelectedFilePreview,
} from "./service-provider-utils";
import { useServiceProviderCursorPage } from "./use-service-provider-cursor-page";
export function ServiceProviderManager() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = getActiveTab(pathname);
  const pageCopy = getPageCopy(activeTab);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const loadedEditProviderRef = useRef<string | null>(null);
  const editProvider = extractEditProvider(pathname);
  const listPagination = useServiceProviderCursorPage({
    initialServiceType: defaultServiceType,
    initialStatus: "active",
    missingNextMessage: "Không có trang nhà cung cấp sau để chuyển tới.",
    missingPageMessage: (page) => `Chỉ tìm thấy đến trang nhà cung cấp ${page}.`,
    showToast,
  });
  const archivedPagination = useServiceProviderCursorPage({
    initialServiceType: defaultServiceType,
    initialStatus: "archived",
    missingNextMessage: "Không có trang archived sau để chuyển tới.",
    missingPageMessage: (page) => `Chỉ tìm thấy đến trang archived ${page}.`,
    showToast,
  });
  const mediaPagination = useServiceProviderCursorPage({
    initialServiceType: defaultServiceType,
    initialStatus: "active",
    missingNextMessage: "Không có trang provider ảnh sau để chuyển tới.",
    missingPageMessage: (page) => `Chỉ tìm thấy đến trang provider ảnh ${page}.`,
    showToast,
  });

  const [editingProvider, setEditingProvider] = useState<InternalServiceProvider | null>(null);
  const [mediaProvider, setMediaProvider] = useState<InternalServiceProvider | null>(null);
  const [form, setForm] = useState<ServiceProviderMutationRequest>(initialForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ServiceProviderMutationRequest, string>>>({});
  const [dangerAction, setDangerAction] = useState<DangerAction>(null);
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<SelectedFilePreview[]>([]);

  const selectedFiles = useMemo(() => selectedFilePreviews.map((item) => item.file), [selectedFilePreviews]);
  const mediaTarget = mediaProvider ?? editingProvider;

  const setProviderImageFiles = (nextFiles: File[]) => {
    setSelectedFilePreviews((current) => {
      for (const item of current) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return nextFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
    });
  };

  const listQuery = useQuery({
    queryKey: [
      "internal",
      "service-providers",
      "page",
      listPagination.serviceType,
      listPagination.status,
      listPagination.cursor,
      listPagination.pageSize,
      listPagination.searchQuery,
    ] as const,
    queryFn: () =>
      getInternalServiceProviderPage({
        cursor: listPagination.cursor ?? undefined,
        limit: listPagination.pageSize,
        q: listPagination.searchQuery,
        serviceType: listPagination.serviceType,
        status: listPagination.status,
      }),
  });

  const archivedQuery = useQuery({
    queryKey: [
      "internal",
      "service-providers",
      "archived",
      archivedPagination.serviceType,
      archivedPagination.cursor,
      archivedPagination.pageSize,
      archivedPagination.searchQuery,
    ] as const,
    queryFn: () =>
      getInternalServiceProviderPage({
        cursor: archivedPagination.cursor ?? undefined,
        limit: archivedPagination.pageSize,
        q: archivedPagination.searchQuery,
        serviceType: archivedPagination.serviceType,
        status: "archived",
      }),
  });

  const mediaProvidersQuery = useQuery({
    queryKey: [
      "internal",
      "service-providers",
      "media-picker",
      mediaPagination.serviceType,
      mediaPagination.status,
      mediaPagination.cursor,
      mediaPagination.pageSize,
      mediaPagination.searchQuery,
    ] as const,
    queryFn: () =>
      getInternalServiceProviderPage({
        cursor: mediaPagination.cursor ?? undefined,
        limit: mediaPagination.pageSize,
        q: mediaPagination.searchQuery,
        serviceType: mediaPagination.serviceType,
        status: mediaPagination.status,
      }),
  });

  const statsQuery = useQuery({
    queryKey: ["internal", "service-providers", "stats", listPagination.serviceType] as const,
    queryFn: () => getInternalServiceProviders(listPagination.serviceType),
  });

  const archivedStatsQuery = useQuery({
    queryKey: ["internal", "service-providers", "stats", archivedPagination.serviceType, "archived"] as const,
    queryFn: () => getInternalServiceProviders(archivedPagination.serviceType, "archived"),
  });

  const mediaQuery = useQuery({
    enabled: Boolean(mediaTarget),
    queryKey: ["internal", "service-provider-media", mediaTarget?.serviceType, mediaTarget?.providerId] as const,
    queryFn: () => getInternalServiceProviderMedia(mediaTarget?.serviceType ?? "", mediaTarget?.providerId ?? ""),
  });

  const stats = useMemo(() => {
    const providers = statsQuery.data?.providers ?? [];
    const archived = archivedStatsQuery.data?.providers.length ?? 0;

    return {
      active: providers.filter((provider) => provider.status === "active").length,
      archived,
      inactive: providers.filter((provider) => provider.status === "inactive").length,
      suspended: providers.filter((provider) => provider.status === "suspended").length,
      total: providers.length,
      withImage: providers.filter((provider) => provider.imageUrl).length,
    };
  }, [archivedStatsQuery.data?.providers.length, statsQuery.data?.providers]);

  const invalidateProviders = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["internal", "service-providers"] }),
      queryClient.invalidateQueries({ queryKey: ["internal", "service-provider-media"] }),
    ]);
  };

  const uploadSelectedFiles = async (provider: InternalServiceProvider) => {
    if (selectedFiles.length === 0) {
      return 0;
    }

    await uploadInternalServiceProviderMedia(provider.serviceType, provider.providerId, {
      files: selectedFiles,
      isCover: !provider.imageUrl,
    });

    return selectedFiles.length;
  };

  const saveMutation = useMutation({
    mutationFn: async (input: ServiceProviderMutationRequest) => {
      const response = editingProvider
        ? await updateInternalServiceProvider(editingProvider.serviceType, editingProvider.providerId, input)
        : await createInternalServiceProvider(input);
      const uploadedCount = await uploadSelectedFiles(response.provider);

      return {
        provider: response.provider,
        uploadedCount,
      };
    },
    onSuccess: async (response) => {
      await invalidateProviders();
      setEditingProvider(response.provider);
      setMediaProvider(null);
      setForm(buildForm(response.provider));
      setFormErrors({});
      setProviderImageFiles([]);
      showToast({
        message:
          response.uploadedCount > 0
            ? `Nhà cung cấp và ${response.uploadedCount} ảnh đã được lưu.`
            : "Nhà cung cấp đã được lưu.",
        title: "Lưu thành công",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể lưu nhà cung cấp.",
        title: "Lưu chưa thành công",
        variant: "error",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (provider: InternalServiceProvider) => deleteInternalServiceProvider(provider.serviceType, provider.providerId),
    onSuccess: async (response) => {
      await invalidateProviders();
      if (response.provider.providerId === editingProvider?.providerId) {
        resetForm();
      }
      showToast({
        message: "Nhà cung cấp đã được chuyển vào archived.",
        title: "Đã lưu trữ",
        variant: "success",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (provider: InternalServiceProvider) => restoreInternalServiceProvider(provider.serviceType, provider.providerId),
    onSuccess: async () => {
      await invalidateProviders();
      showToast({
        message: "Nhà cung cấp đã được khôi phục.",
        title: "Đã khôi phục",
        variant: "success",
      });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (provider: InternalServiceProvider) => hardDeleteInternalServiceProvider(provider.serviceType, provider.providerId),
    onSuccess: async (response) => {
      await invalidateProviders();
      if (response.provider.providerId === editingProvider?.providerId) {
        resetForm();
      }
      if (response.provider.providerId === mediaProvider?.providerId) {
        setMediaProvider(null);
      }
      showToast({
        message: "Nhà cung cấp và toàn bộ ảnh đã bị xóa vĩnh viễn.",
        title: "Đã xóa vĩnh viễn",
        variant: "success",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!mediaTarget || selectedFiles.length === 0) {
        throw new Error("Vui lòng chọn ảnh nhà cung cấp.");
      }

      return uploadInternalServiceProviderMedia(mediaTarget.serviceType, mediaTarget.providerId, {
        files: selectedFiles,
        isCover: !mediaTarget.imageUrl,
      });
    },
    onSuccess: async () => {
      await invalidateProviders();
      setProviderImageFiles([]);
      showToast({
        message: "Ảnh nhà cung cấp đã được tải lên.",
        title: "Upload thành công",
        variant: "success",
      });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (media: InternalServiceProviderMedia) => deleteInternalServiceProviderMedia(media.serviceType, media.providerId, media.mediaId),
    onSuccess: async () => {
      await invalidateProviders();
      showToast({
        message: "Ảnh nhà cung cấp đã được xóa.",
        title: "Đã xóa ảnh",
        variant: "success",
      });
    },
  });

  const setCoverMutation = useMutation({
    mutationFn: (media: InternalServiceProviderMedia) => setInternalServiceProviderMediaCover(media.serviceType, media.providerId, media.mediaId),
    onSuccess: async () => {
      await invalidateProviders();
      showToast({
        message: "Ảnh đại diện nhà cung cấp đã được cập nhật.",
        title: "Đã đặt cover",
        variant: "success",
      });
    },
  });

  useEffect(
    () => () => {
      for (const item of selectedFilePreviews) {
        URL.revokeObjectURL(item.previewUrl);
      }
    },
    [selectedFilePreviews],
  );

  useEffect(() => {
    if (!editProvider || loadedEditProviderRef.current === `${editProvider.serviceType}:${editProvider.providerId}`) {
      return;
    }

    loadedEditProviderRef.current = `${editProvider.serviceType}:${editProvider.providerId}`;
    void getInternalServiceProvider(editProvider.serviceType, editProvider.providerId)
      .then((response) => {
        const provider = response.provider;

        setEditingProvider(provider);
        setMediaProvider(null);
        setForm(buildForm(provider));
        setFormErrors({});
        setSelectedFilePreviews((current) => {
          for (const item of current) {
            URL.revokeObjectURL(item.previewUrl);
          }

          return [];
        });
      })
      .catch(() => {
        loadedEditProviderRef.current = null;
      });
  }, [editProvider]);

  function startEdit(provider: InternalServiceProvider, options?: { preserveUrl?: boolean }) {
    setEditingProvider(provider);
    setMediaProvider(null);
    setForm(buildForm(provider));
    setFormErrors({});
    setProviderImageFiles([]);
    if (!options?.preserveUrl) {
      router.push(buildEditHref(provider));
    }
  }

  function selectMediaProvider(provider: InternalServiceProvider) {
    setMediaProvider(provider);
    setEditingProvider((current) => current);
    setProviderImageFiles([]);
    router.push("/internal/providers/media");
  }

  function resetForm() {
    setEditingProvider(null);
    setMediaProvider(null);
    setForm({
      ...initialForm,
      serviceType: listPagination.serviceType,
    });
    setFormErrors({});
    setProviderImageFiles([]);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = serviceProviderMutationSchema.safeParse(form);

    if (!parsed.success) {
      setFormErrors(toValidationErrors(parsed.error.issues));
      showToast({
        message: parsed.error.issues[0]?.message ?? "Dữ liệu nhà cung cấp không hợp lệ.",
        title: "Kiểm tra lại dữ liệu",
        variant: "error",
      });
      return;
    }

    setFormErrors({});
    saveMutation.mutate(parsed.data);
  }

  function confirmDangerAction() {
    if (dangerAction?.kind === "archive") {
      archiveMutation.mutate(dangerAction.provider);
    }

    if (dangerAction?.kind === "restore") {
      restoreMutation.mutate(dangerAction.provider);
    }

    if (dangerAction?.kind === "hard-delete") {
      hardDeleteMutation.mutate(dangerAction.provider);
    }

    if (dangerAction?.kind === "delete-media") {
      deleteMediaMutation.mutate(dangerAction.media);
    }

    setDangerAction(null);
  }

  const handlePrimaryAction = () => {
    resetForm();
    router.push(activeTab === "manage" ? "/internal/providers/list" : "/internal/providers/manage");
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
            {activeTab === "manage" ? <FiGrid size={17} /> : <FiPlus size={17} />}
            {activeTab === "manage" ? "Danh sách" : "Nhà cung cấp mới"}
          </button>
        }
        description={pageCopy.description}
        title={pageCopy.title}
      />

      <ProviderTabs pathname={pathname} />
      <ProviderStats stats={stats} />

      {activeTab === "manage" ? (
        <ProviderManageSection
          editingProvider={editingProvider}
          form={form}
          formErrors={formErrors}
          media={mediaQuery.data?.media ?? []}
          mediaPending={mediaQuery.isLoading}
          onDeleteMedia={(media) => setDangerAction({ kind: "delete-media", media })}
          onSelectFiles={setProviderImageFiles}
          onSetCover={(media) => setCoverMutation.mutate(media)}
          onSubmit={handleSubmit}
          resetForm={resetForm}
          savePending={saveMutation.isPending}
          selectedFilePreviews={selectedFilePreviews}
          selectedFiles={selectedFiles}
          setForm={setForm}
        />
      ) : null}

      {activeTab === "list" ? (
        <ProviderListSection
          archivePending={archiveMutation.isPending}
          currentPage={listPagination.currentPage}
          hardDeletePending={hardDeleteMutation.isPending}
          hasNextPage={Boolean(listQuery.data?.nextCursor)}
          hasPreviousPage={listPagination.canGoToPreviousPage}
          isLoading={listQuery.isLoading}
          isPaging={listQuery.isFetching || listPagination.isPageJumping}
          onArchive={(provider) => setDangerAction({ kind: "archive", provider })}
          onEdit={startEdit}
          onHardDelete={(provider) => setDangerAction({ kind: "hard-delete", provider })}
          onJumpToPage={(page) => listPagination.jumpToPage(page, listQuery.data?.nextCursor ?? null)}
          onManageImage={selectMediaProvider}
          onNextPage={() => listPagination.goToNextPage(listQuery.data?.nextCursor ?? null)}
          onPreviousPage={listPagination.goToPreviousPage}
          pageSize={listPagination.pageSize}
          providers={listQuery.data?.providers ?? []}
          searchQuery={listPagination.searchQuery}
          serviceType={listPagination.serviceType}
          setPageSize={listPagination.setPageSize}
          setSearchQuery={listPagination.setSearchQuery}
          setServiceType={listPagination.setServiceType}
          setStatus={listPagination.setStatus}
          status={listPagination.status}
        />
      ) : null}

      {activeTab === "archived" ? (
        <ProviderArchivedSection
          currentPage={archivedPagination.currentPage}
          hardDeletePending={hardDeleteMutation.isPending}
          hasNextPage={Boolean(archivedQuery.data?.nextCursor)}
          hasPreviousPage={archivedPagination.canGoToPreviousPage}
          isLoading={archivedQuery.isLoading}
          isPaging={archivedQuery.isFetching || archivedPagination.isPageJumping}
          onHardDelete={(provider) => setDangerAction({ kind: "hard-delete", provider })}
          onJumpToPage={(page) => archivedPagination.jumpToPage(page, archivedQuery.data?.nextCursor ?? null)}
          onNextPage={() => archivedPagination.goToNextPage(archivedQuery.data?.nextCursor ?? null)}
          onPreviousPage={archivedPagination.goToPreviousPage}
          onRestore={(provider) => setDangerAction({ kind: "restore", provider })}
          pageSize={archivedPagination.pageSize}
          providers={archivedQuery.data?.providers ?? []}
          restorePending={restoreMutation.isPending}
          searchQuery={archivedPagination.searchQuery}
          serviceType={archivedPagination.serviceType}
          setPageSize={archivedPagination.setPageSize}
          setSearchQuery={archivedPagination.setSearchQuery}
          setServiceType={archivedPagination.setServiceType}
        />
      ) : null}

      {activeTab === "media" ? (
        <ProviderMediaSection
          currentPage={mediaPagination.currentPage}
          hasNextPage={Boolean(mediaProvidersQuery.data?.nextCursor)}
          hasPreviousPage={mediaPagination.canGoToPreviousPage}
          isLoading={mediaProvidersQuery.isLoading}
          isPaging={mediaProvidersQuery.isFetching || mediaPagination.isPageJumping}
          media={mediaQuery.data?.media ?? []}
          mediaPending={mediaQuery.isLoading}
          mediaTarget={mediaTarget}
          onDeleteMedia={(media) => setDangerAction({ kind: "delete-media", media })}
          onJumpToPage={(page) => mediaPagination.jumpToPage(page, mediaProvidersQuery.data?.nextCursor ?? null)}
          onNextPage={() => mediaPagination.goToNextPage(mediaProvidersQuery.data?.nextCursor ?? null)}
          onPreviousPage={mediaPagination.goToPreviousPage}
          onSelectFiles={setProviderImageFiles}
          onSelectProvider={selectMediaProvider}
          onSetCover={(media) => setCoverMutation.mutate(media)}
          onUpload={() => uploadMutation.mutate()}
          pageSize={mediaPagination.pageSize}
          providers={mediaProvidersQuery.data?.providers ?? []}
          searchQuery={mediaPagination.searchQuery}
          selectedFilePreviews={selectedFilePreviews}
          selectedFiles={selectedFiles}
          serviceType={mediaPagination.serviceType}
          setPageSize={mediaPagination.setPageSize}
          setSearchQuery={mediaPagination.setSearchQuery}
          setServiceType={mediaPagination.setServiceType}
          setStatus={mediaPagination.setStatus}
          status={mediaPagination.status}
          uploadPending={uploadMutation.isPending}
        />
      ) : null}

      <ConfirmModal
        confirmLabel={
          dangerAction?.kind === "delete-media"
            ? "Xóa ảnh"
            : dangerAction?.kind === "restore"
              ? "Khôi phục"
              : dangerAction?.kind === "hard-delete"
                ? "Xóa vĩnh viễn"
                : "Lưu trữ"
        }
        description={
          dangerAction?.kind === "delete-media"
            ? "Ảnh nhà cung cấp sẽ bị xóa khỏi storage và gallery."
            : dangerAction?.kind === "restore"
              ? "Nhà cung cấp archived sẽ quay lại trạng thái trước khi lưu trữ."
              : dangerAction?.kind === "hard-delete"
                ? "Nhà cung cấp, metadata ảnh và toàn bộ file ảnh vật lý sẽ bị xóa vĩnh viễn."
                : "Nhà cung cấp sẽ được xóa mềm khỏi danh sách và chuyển sang archived."
        }
        open={dangerAction !== null}
        onCancel={() => setDangerAction(null)}
        onConfirm={confirmDangerAction}
        title={
          dangerAction?.kind === "delete-media"
            ? "Xóa ảnh nhà cung cấp?"
            : dangerAction?.kind === "restore"
              ? "Khôi phục nhà cung cấp?"
              : dangerAction?.kind === "hard-delete"
                ? "Xóa vĩnh viễn nhà cung cấp?"
                : "Lưu trữ nhà cung cấp?"
        }
      />
    </div>
  );
}
