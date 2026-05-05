"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useToast } from "@/components/ui/toast";
import {
  archiveInternalDestination,
  createInternalDestination as createInternalDestinationApi,
  deleteInternalDestinationMedia,
  getInternalDestinationMedia,
  getInternalDestinationPage,
  hardDeleteInternalDestination,
  setInternalDestinationMediaCover,
  restoreInternalDestination,
  updateInternalDestination,
  uploadInternalDestinationMedia,
  type ApiError,
} from "@/lib/client/api-client";
import { destinationMutationSchema, type DestinationMutationRequest, type InternalDestination } from "@/lib/shared/internal";

import { useInternalUnsavedChanges } from "./internal-shell";
import { useDestinationCursorPage } from "./use-destination-cursor-page";
import { useDestinationMediaState } from "./use-destination-media-state";
import type { MapLocationSelection } from "./map-location-picker";
import {
  buildFormFromDestination,
  extractLocationFields,
  joinKeywords,
  splitLines,
  toValidationErrors,
  type DraftCreationError,
} from "./destination-manager-utils";

const initialForm: DestinationMutationRequest = {
  address: "",
  category: "landmark",
  city: "",
  country: "",
  coverImageUrl: "",
  description: "",
  latitude: 16.0471,
  longitude: 108.2068,
  name: "",
  popularityScore: 0,
  region: "",
  safetyLevel: "An toàn",
  searchKeywords: [],
  status: "draft",
};

export function useDestinationManager() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { setIsDirty } = useInternalUnsavedChanges();
  const listPagination = useDestinationCursorPage({
    initialStatus: "published",
    missingNextMessage: "Không có trang sau để chuyển tới.",
    missingPageMessage: (page) => `Chỉ tìm thấy đến trang ${page}.`,
    showToast,
  });
  const archivedPagination = useDestinationCursorPage({
    fixedStatus: "archived",
    initialStatus: "archived",
    missingNextMessage: "Không có trang archived sau để chuyển tới.",
    missingPageMessage: (page) => `Chỉ tìm thấy đến trang archived ${page}.`,
    showToast,
  });
  const mediaState = useDestinationMediaState();
  const [editingDestination, setEditingDestination] = useState<InternalDestination | null>(null);
  const [form, setForm] = useState<DestinationMutationRequest>(initialForm);
  const [savedForm, setSavedForm] = useState<DestinationMutationRequest>(initialForm);
  const [keywordsText, setKeywordsText] = useState("");
  const [savedKeywordsText, setSavedKeywordsText] = useState("");
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DestinationMutationRequest, string>> & { searchKeywords?: string }>({});
  const [draftCreationError, setDraftCreationError] = useState<DraftCreationError | null>(null);
  const [dangerAction, setDangerAction] = useState<null | { kind: "archive" | "delete-media" | "hard-delete" | "restore"; destinationId?: string; mediaId?: string }>(null);

  const destinationsQuery = useQuery({
    queryKey: useMemo(
      () => ["internal", "destinations", "page", listPagination.status, listPagination.cursor, listPagination.pageSize, listPagination.searchQuery] as const,
      [listPagination.cursor, listPagination.pageSize, listPagination.searchQuery, listPagination.status],
    ),
    queryFn: () =>
      getInternalDestinationPage({
        cursor: listPagination.cursor ?? undefined,
        limit: listPagination.pageSize,
        q: listPagination.searchQuery,
        status: listPagination.status,
      }),
  });
  const archivedDestinationsQuery = useQuery({
    queryKey: ["internal", "destinations", "archived", archivedPagination.cursor, archivedPagination.pageSize, archivedPagination.searchQuery] as const,
    queryFn: () =>
      getInternalDestinationPage({
        cursor: archivedPagination.cursor ?? undefined,
        limit: archivedPagination.pageSize,
        q: archivedPagination.searchQuery,
        status: "archived",
      }),
  });
  const mediaQuery = useQuery({
    enabled: Boolean(editingDestination),
    queryKey: useMemo(() => ["internal", "destination-media", editingDestination?.destinationId] as const, [editingDestination?.destinationId]),
    queryFn: () => getInternalDestinationMedia(editingDestination?.destinationId ?? ""),
  });

  const uploadDraftMediaQueue = async (destinationId: string) => {
    for (const item of mediaState.draftMediaItemsRef.current) {
      await uploadInternalDestinationMedia(destinationId, {
        file: item.file,
        isCover: item.isCover,
        mediaType: mediaState.mediaType || "image",
        title: item.file.name,
      });
    }
  };

  const saveMutation = useMutation({
    mutationFn: (input: DestinationMutationRequest) =>
      editingDestination ? updateInternalDestination(editingDestination.destinationId, input) : createInternalDestinationApi(input),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-options"] }),
      ]);
      const nextForm = buildFormFromDestination(response.destination);
      const nextKeywordsText = joinKeywords(response.destination.searchKeywords);

      setEditingDestination(response.destination);
      setForm(nextForm);
      setSavedForm(nextForm);
      setKeywordsText(nextKeywordsText);
      setSavedKeywordsText(nextKeywordsText);
      setFormErrors({});

      if (mediaState.draftMediaItemsRef.current.length > 0) {
        try {
          await uploadDraftMediaQueue(response.destination.destinationId);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["internal", "destination-media", response.destination.destinationId] }),
            queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
            queryClient.invalidateQueries({ queryKey: ["internal", "destination-options"] }),
          ]);
          mediaState.clearDraftMediaItems();
          mediaState.resetMediaFields();
          showToast({
            message:
              response.destination.status === "published"
                ? "Địa điểm đã được lưu và ảnh nháp đã được tải lên 4K."
                : "Địa điểm đã được lưu vào DB và ảnh nháp đã được lưu vật lý 4K.",
            title: "Lưu thành công",
            variant: "success",
          });
          return;
        } catch (error) {
          showToast({
            message: (error as ApiError | undefined)?.message ?? "Địa điểm đã lưu, nhưng không thể tải ảnh nháp.",
            title: "Ảnh nháp chưa lưu xong",
            variant: "error",
          });
          return;
        }
      }

      if (response.destination.status !== "published") {
        showToast({
          message: "Địa điểm đã được lưu.",
          title: "Lưu thành công",
          variant: "success",
        });
        return;
      }

      if (mediaState.selectedFile) {
        showToast({
          message: "Địa điểm đã được lưu. Ảnh sẽ được tải lên ngay.",
          title: "Lưu thành công",
          variant: "success",
        });
        uploadMutation.mutate({
          destinationId: response.destination.destinationId,
          file: mediaState.selectedFile,
          isCover: mediaState.isCover,
          mediaType: mediaState.mediaType,
          title: mediaState.mediaTitle.trim() || undefined,
        });
        return;
      }

      mediaState.resetMediaFields();

      showToast({
        message: "Địa điểm đã được lưu.",
        title: "Lưu thành công",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể lưu địa điểm.",
        title: "Lưu chưa thành công",
        variant: "error",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: archiveInternalDestination,
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-options"] }),
      ]);
      if (response.destination.destinationId === editingDestination?.destinationId) {
        const nextForm = buildFormFromDestination(response.destination);
        const nextKeywordsText = joinKeywords(response.destination.searchKeywords);

        setEditingDestination(response.destination);
        setForm(nextForm);
        setSavedForm(nextForm);
        setKeywordsText(nextKeywordsText);
        setSavedKeywordsText(nextKeywordsText);
      }
      showToast({
        message: "Địa điểm đã chuyển sang archived.",
        title: "Đã lưu trữ",
        variant: "success",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: restoreInternalDestination,
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-options"] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations", "archived"] }),
      ]);
      if (response.destination.destinationId === editingDestination?.destinationId) {
        const nextForm = buildFormFromDestination(response.destination);
        const nextKeywordsText = joinKeywords(response.destination.searchKeywords);

        setEditingDestination(response.destination);
        setForm(nextForm);
        setSavedForm(nextForm);
        setKeywordsText(nextKeywordsText);
        setSavedKeywordsText(nextKeywordsText);
      }
      showToast({
        message: "Địa điểm đã được khôi phục về draft.",
        title: "Đã khôi phục",
        variant: "success",
      });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: hardDeleteInternalDestination,
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-options"] }),
      ]);

      if (response.destination.destinationId === editingDestination?.destinationId) {
        resetForm();
      }

      showToast({
        message: "Địa điểm và media đã bị xóa vĩnh viễn.",
        title: "Đã xóa vĩnh viễn",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể xóa vĩnh viễn địa điểm.",
        title: "Xóa chưa thành công",
        variant: "error",
      });
    },
  });

  const quickStatusMutation = useMutation({
    mutationFn: ({ destination, status: nextStatus }: { destination: InternalDestination; status: DestinationMutationRequest["status"] }) =>
      updateInternalDestination(destination.destinationId, {
        ...buildFormFromDestination(destination),
        status: nextStatus,
      }),
    onSuccess: async (response) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-options"] }),
      ]);

      if (response.destination.destinationId === editingDestination?.destinationId) {
        const nextForm = buildFormFromDestination(response.destination);
        const nextKeywordsText = joinKeywords(response.destination.searchKeywords);

        setEditingDestination(response.destination);
        setForm(nextForm);
        setSavedForm(nextForm);
        setKeywordsText(nextKeywordsText);
        setSavedKeywordsText(nextKeywordsText);
      }

      showToast({
        message: `Địa điểm đã chuyển sang ${response.destination.status}.`,
        title: "Đã cập nhật trạng thái",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể cập nhật trạng thái địa điểm.",
        title: "Cập nhật chưa thành công",
        variant: "error",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (input: {
      destinationId: string;
      file: File;
      isCover: boolean;
      mediaType: string;
      title?: string;
    }) =>
      uploadInternalDestinationMedia(input.destinationId, {
        file: input.file,
        isCover: input.isCover,
        mediaType: input.mediaType,
        title: input.title,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-media", editingDestination?.destinationId] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-options"] }),
      ]);
      mediaState.resetMediaFields();
      showToast({
        message: "Ảnh đã được tải lên và chuẩn hóa 4K.",
        title: "Upload thành công",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể tải ảnh.",
        title: "Upload chưa thành công",
        variant: "error",
      });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: ({ mediaId }: { mediaId: string }) => {
      if (!editingDestination) {
        throw new Error("Thiếu địa điểm đang chỉnh sửa.");
      }

      return deleteInternalDestinationMedia(editingDestination.destinationId, mediaId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-media", editingDestination?.destinationId] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-options"] }),
      ]);
      showToast({
        message: "Ảnh đã được xóa.",
        title: "Đã xóa ảnh",
        variant: "success",
      });
    },
  });

  const setCoverMutation = useMutation({
    mutationFn: (mediaId: string) => {
      if (!editingDestination) {
        throw new Error("Thiếu địa điểm đang chỉnh sửa.");
      }

      return setInternalDestinationMediaCover(editingDestination.destinationId, mediaId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-media", editingDestination?.destinationId] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
      ]);
      showToast({
        message: "Ảnh đại diện đã được cập nhật.",
        title: "Đã đặt ảnh đại diện",
        variant: "success",
      });
    },
  });

  const destinations = destinationsQuery.data?.destinations ?? [];
  const destinationsNextCursor = destinationsQuery.data?.nextCursor ?? null;
  const archivedDestinations = archivedDestinationsQuery.data?.destinations ?? [];
  const archivedDestinationsNextCursor = archivedDestinationsQuery.data?.nextCursor ?? null;
  const media = mediaQuery.data?.media ?? [];

  const hasUnsavedChanges =
    JSON.stringify({
      form,
      keywordsText,
      mediaTitle: mediaState.mediaTitle,
      mediaType: mediaState.mediaType,
      isCover: mediaState.isCover,
      selectedFile: Boolean(mediaState.selectedFile),
      draftMediaItems: mediaState.draftMediaItems.map((item) => `${item.file.name}:${item.isCover}`),
    }) !==
    JSON.stringify({
      form: savedForm,
      keywordsText: savedKeywordsText,
      mediaTitle: "",
      mediaType: "image",
      isCover: true,
      selectedFile: false,
      draftMediaItems: [],
    });

  useEffect(() => {
    setIsDirty(hasUnsavedChanges);

    return () => setIsDirty(false);
  }, [hasUnsavedChanges, setIsDirty]);

  const startEdit = (destination: InternalDestination) => {
    setEditingDestination(destination);
    const nextForm = buildFormFromDestination(destination);
    const nextKeywordsText = joinKeywords(destination.searchKeywords);

    setForm(nextForm);
    setSavedForm(nextForm);
    setKeywordsText(nextKeywordsText);
    setSavedKeywordsText(nextKeywordsText);
    mediaState.resetMediaFields();
    mediaState.clearDraftMediaItems();
    setFormErrors({});
    setDraftCreationError(null);
  };

  const requestDeleteMedia = (mediaId: string) => {
    setDangerAction({ kind: "delete-media", mediaId });
  };

  const requestArchiveCurrent = () => {
    if (editingDestination) {
      setDangerAction({ kind: "archive", destinationId: editingDestination.destinationId });
    }
  };

  const confirmDangerAction = () => {
    if (dangerAction?.kind === "archive" && dangerAction.destinationId) {
      archiveMutation.mutate(dangerAction.destinationId);
    }

    if (dangerAction?.kind === "restore" && dangerAction.destinationId) {
      restoreMutation.mutate(dangerAction.destinationId);
    }

    if (dangerAction?.kind === "hard-delete" && dangerAction.destinationId) {
      hardDeleteMutation.mutate(dangerAction.destinationId);
    }

    if (dangerAction?.kind === "delete-media" && dangerAction.mediaId) {
      deleteMediaMutation.mutate({ mediaId: dangerAction.mediaId });
    }

    setDangerAction(null);
  };

  const resetForm = () => {
    setEditingDestination(null);
    setForm(initialForm);
    setSavedForm(initialForm);
    setKeywordsText("");
    setSavedKeywordsText("");
    mediaState.resetMediaFields();
    mediaState.clearDraftMediaItems();
    setFormErrors({});
    setDraftCreationError(null);
  };

  const handleMapSelect = (selection: MapLocationSelection) => {
    const fields = extractLocationFields(selection, "");
    const nextForm = {
      ...form,
      address: fields.address,
      city: fields.city,
      country: fields.country,
      latitude: fields.latitude,
      longitude: fields.longitude,
      name: fields.name,
      region: fields.region,
    };

    setForm(nextForm);
  };

  const saveDestinationWithStatus = (nextStatus?: DestinationMutationRequest["status"]) => {
    const parsed = destinationMutationSchema.safeParse({
      ...form,
      status: nextStatus ?? form.status,
      coverImageUrl: form.coverImageUrl || "",
      searchKeywords: splitLines(keywordsText),
    });

    if (!parsed.success) {
      setFormErrors(toValidationErrors(parsed.error.issues));
      showToast({
        message: parsed.error.issues[0]?.message ?? "Dữ liệu địa điểm không hợp lệ.",
        title: "Kiểm tra lại dữ liệu",
        variant: "error",
      });
      return;
    }

    setFormErrors({});
    saveMutation.mutate(parsed.data);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveDestinationWithStatus();
  };

  const saveAsStatus = (nextStatus: DestinationMutationRequest["status"]) => {
    saveDestinationWithStatus(nextStatus);
  };

  return {
    archivePending: archiveMutation.isPending,
    dangerAction,
    deletePending: deleteMediaMutation.isPending,
    archivedDestinations,
    archivedDestinationsNextCursor,
    archivedPageSize: archivedPagination.pageSize,
    archivedSearchQuery: archivedPagination.searchQuery,
    destinations,
    editingDestination,
    draftCreationError,
    draftMediaItems: mediaState.draftMediaItems,
    form,
    formErrors,
    handleMapSelect,
    handleSubmit,
    isCover: mediaState.isCover,
    isCreatingDraft: false,
    isLoading: destinationsQuery.isLoading,
    keywordsText,
    media,
    mediaTitle: mediaState.mediaTitle,
    mediaType: mediaState.mediaType,
    destinationsNextCursor,
    confirmDangerAction,
    onArchiveCurrent: requestArchiveCurrent,
    onOpenArchiveConfirm: (destinationId: string) => setDangerAction({ kind: "archive", destinationId }),
    onOpenDeleteMediaConfirm: requestDeleteMedia,
    onOpenHardDeleteConfirm: (destinationId: string) => setDangerAction({ kind: "hard-delete", destinationId }),
    onOpenRestoreConfirm: (destinationId: string) => setDangerAction({ kind: "restore", destinationId }),
    onAddDraftMediaItems: mediaState.addDraftMediaItems,
    onClearDraftMediaItems: mediaState.clearDraftMediaItems,
    onReset: resetForm,
    onRetryDraft: () => undefined,
    onSaveAsStatus: saveAsStatus,
    onChangeDestinationStatus: (destination: InternalDestination, nextStatus: DestinationMutationRequest["status"]) =>
      quickStatusMutation.mutate({ destination, status: nextStatus }),
    onSetCover: (mediaId: string) => setCoverMutation.mutate(mediaId),
    onRemoveDraftMediaItem: mediaState.removeDraftMediaItem,
    onSetDraftMediaCover: mediaState.setDraftMediaCover,
    onUpload: () => {
      if (!editingDestination || !mediaState.selectedFile || editingDestination.status !== "published") {
        return;
      }

      uploadMutation.mutate({
        destinationId: editingDestination.destinationId,
        file: mediaState.selectedFile,
        isCover: mediaState.isCover,
        mediaType: mediaState.mediaType,
        title: mediaState.mediaTitle.trim() || undefined,
      });
    },
    setDangerAction,
    setDraftCreationError,
    startEdit,
    savePending: saveMutation.isPending,
    statusChangePending: quickStatusMutation.isPending,
    selectedFile: mediaState.selectedFile,
    selectedFilePreviewUrl: mediaState.selectedFilePreviewUrl,
    setCoverPending: setCoverMutation.isPending,
    setForm,
    setIsCover: mediaState.setIsCover,
    setKeywordsText,
    setMediaTitle: mediaState.setMediaTitle,
    setMediaType: mediaState.setMediaType,
    setSelectedFile: mediaState.setSelectedFile,
    setStatus: listPagination.setStatus,
    setPageSize: listPagination.setPageSize,
    setSearchQuery: listPagination.setSearchQuery,
    setListCursor: listPagination.setCursor,
    setListCursorHistory: listPagination.setCursorHistory,
    onNextDestinationsPage: () => listPagination.goToNextPage(destinationsNextCursor),
    onPreviousDestinationsPage: listPagination.goToPreviousPage,
    onJumpToDestinationsPage: (page: number) => listPagination.jumpToPage(page, destinationsNextCursor),
    canGoToPreviousDestinationsPage: listPagination.canGoToPreviousPage,
    currentDestinationsPage: listPagination.currentPage,
    status: listPagination.status,
    pageSize: listPagination.pageSize,
    searchQuery: listPagination.searchQuery,
    isPaging: destinationsQuery.isFetching || listPagination.isPageJumping,
    isArchivedLoading: archivedDestinationsQuery.isLoading,
    isArchivedPaging: archivedDestinationsQuery.isFetching || archivedPagination.isPageJumping,
    restorePending: restoreMutation.isPending,
    hardDeletePending: hardDeleteMutation.isPending,
    onNextArchivedDestinationsPage: () => archivedPagination.goToNextPage(archivedDestinationsNextCursor),
    onPreviousArchivedDestinationsPage: archivedPagination.goToPreviousPage,
    onJumpToArchivedDestinationsPage: (page: number) => archivedPagination.jumpToPage(page, archivedDestinationsNextCursor),
    canGoToPreviousArchivedDestinationsPage: archivedPagination.canGoToPreviousPage,
    currentArchivedDestinationsPage: archivedPagination.currentPage,
    setArchivedPageSize: archivedPagination.setPageSize,
    setArchivedSearchQuery: archivedPagination.setSearchQuery,
    uploadPending: uploadMutation.isPending,
  } as const;
}
