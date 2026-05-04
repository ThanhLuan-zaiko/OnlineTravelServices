"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useToast } from "@/components/ui/toast";
import {
  archiveInternalDestination,
  createInternalDestination as createInternalDestinationApi,
  deleteInternalDestinationMedia,
  getInternalDestinationMedia,
  getInternalDestinations,
  setInternalDestinationMediaCover,
  updateInternalDestination,
  uploadInternalDestinationMedia,
  type ApiError,
} from "@/lib/client/api-client";
import { destinationMutationSchema, type DestinationMutationRequest, type InternalDestination } from "@/lib/shared/internal";

import { useInternalUnsavedChanges } from "./internal-shell";
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
  const [status, setStatus] = useState("");
  const [editingDestination, setEditingDestination] = useState<InternalDestination | null>(null);
  const [form, setForm] = useState<DestinationMutationRequest>(initialForm);
  const [savedForm, setSavedForm] = useState<DestinationMutationRequest>(initialForm);
  const [keywordsText, setKeywordsText] = useState("");
  const [savedKeywordsText, setSavedKeywordsText] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [isCover, setIsCover] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreatingDraft, setIsCreatingDraft] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof DestinationMutationRequest, string>> & { searchKeywords?: string }>({});
  const [dangerAction, setDangerAction] = useState<null | { kind: "archive" | "delete-media"; destinationId?: string; mediaId?: string }>(null);
  const [lastDraftSelection, setLastDraftSelection] = useState<MapLocationSelection | null>(null);
  const [draftCreationError, setDraftCreationError] = useState<DraftCreationError | null>(null);

  const destinationsQuery = useQuery({
    queryKey: useMemo(() => ["internal", "destinations", status] as const, [status]),
    queryFn: () => getInternalDestinations(status || undefined),
  });
  const mediaQuery = useQuery({
    enabled: Boolean(editingDestination),
    queryKey: useMemo(() => ["internal", "destination-media", editingDestination?.destinationId] as const, [editingDestination?.destinationId]),
    queryFn: () => getInternalDestinationMedia(editingDestination?.destinationId ?? ""),
  });

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
      setMediaTitle("");
      setMediaType("image");
      setIsCover(true);
      setSelectedFile(null);
      setFormErrors({});
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
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-options"] }),
      ]);
      showToast({
        message: "Địa điểm đã chuyển sang archived.",
        title: "Đã lưu trữ",
        variant: "success",
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!editingDestination || !selectedFile) {
        throw new Error("Vui lòng chọn ảnh để tải lên.");
      }

      return uploadInternalDestinationMedia(editingDestination.destinationId, {
        file: selectedFile,
        isCover,
        mediaType,
        title: mediaTitle.trim() || undefined,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-media", editingDestination?.destinationId] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destinations"] }),
        queryClient.invalidateQueries({ queryKey: ["internal", "destination-options"] }),
      ]);
      setSelectedFile(null);
      setMediaTitle("");
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
  const media = mediaQuery.data?.media ?? [];

  const hasUnsavedChanges =
    JSON.stringify({
      form,
      keywordsText,
      mediaTitle,
      mediaType,
      isCover,
      selectedFile: Boolean(selectedFile),
    }) !==
    JSON.stringify({
      form: savedForm,
      keywordsText: savedKeywordsText,
      mediaTitle: "",
      mediaType: "image",
      isCover: true,
      selectedFile: false,
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
    setIsCover(true);
    setMediaTitle("");
    setSelectedFile(null);
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
    setMediaTitle("");
    setSelectedFile(null);
    setIsCover(true);
    setFormErrors({});
    setIsCreatingDraft(false);
    setLastDraftSelection(null);
    setDraftCreationError(null);
  };

  const createDraftFromSelection = async (selection: MapLocationSelection, current: DestinationMutationRequest) => {
    setLastDraftSelection(selection);
    const currentName = current.name.trim();
    const fields = extractLocationFields(selection, currentName);
    const nextForm = {
      ...current,
      address: fields.address,
      city: fields.city,
      country: fields.country,
      latitude: fields.latitude,
      longitude: fields.longitude,
      name: fields.name,
      region: fields.region,
    };
    const parsed = destinationMutationSchema.safeParse({
      ...nextForm,
      coverImageUrl: nextForm.coverImageUrl || "",
      searchKeywords: splitLines(keywordsText),
    });

    if (!parsed.success) {
      setFormErrors(toValidationErrors(parsed.error.issues));
      setDraftCreationError({
        message: parsed.error.issues[0]?.message ?? "Dữ liệu địa điểm không hợp lệ.",
      });
      return;
    }

    setFormErrors({});
    setIsCreatingDraft(true);

    try {
      const response = await createInternalDestinationApi(parsed.data);
      const nextSavedForm = buildFormFromDestination(response.destination);
      const nextSavedKeywordsText = joinKeywords(response.destination.searchKeywords);

      setEditingDestination(response.destination);
      setForm(nextSavedForm);
      setSavedForm(nextSavedForm);
      setKeywordsText(nextSavedKeywordsText);
      setSavedKeywordsText(nextSavedKeywordsText);
      setMediaTitle("");
      setMediaType("image");
      setIsCover(true);
      setSelectedFile(null);
      setDraftCreationError(null);
      showToast({
        message: "Bản nháp địa điểm đã được tạo để bạn có thể tải ảnh ngay.",
        title: "Đã tạo nháp",
        variant: "success",
      });
    } catch (error) {
      const apiError = error as ApiError | undefined;
      setDraftCreationError({
        details: apiError?.details,
        message: apiError?.message ?? "Không thể tạo bản nháp địa điểm.",
      });
    } finally {
      setIsCreatingDraft(false);
    }
  };

  const retryCreateDraft = () => {
    if (!lastDraftSelection) {
      return;
    }

    setDraftCreationError(null);
    void createDraftFromSelection(lastDraftSelection, form);
  };

  const handleMapSelect = (selection: MapLocationSelection) => {
    const currentName = form.name.trim();
    const fields = extractLocationFields(selection, currentName);
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
    setDraftCreationError(null);

    if (!editingDestination && !isCreatingDraft) {
      void createDraftFromSelection(selection, nextForm);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = destinationMutationSchema.safeParse({
      ...form,
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

  return {
    archivePending: archiveMutation.isPending,
    dangerAction,
    deletePending: deleteMediaMutation.isPending,
    destinations,
    editingDestination,
    draftCreationError,
    form,
    formErrors,
    handleMapSelect,
    handleSubmit,
    isCover,
    isCreatingDraft,
    isLoading: destinationsQuery.isLoading,
    keywordsText,
    media,
    mediaTitle,
    mediaType,
    confirmDangerAction,
    onArchiveCurrent: requestArchiveCurrent,
    onOpenArchiveConfirm: (destinationId: string) => setDangerAction({ kind: "archive", destinationId }),
    onOpenDeleteMediaConfirm: requestDeleteMedia,
    onReset: resetForm,
    onRetryDraft: retryCreateDraft,
    onSetCover: (mediaId: string) => setCoverMutation.mutate(mediaId),
    onUpload: () => uploadMutation.mutate(),
    setDangerAction,
    setDraftCreationError,
    startEdit,
    savePending: saveMutation.isPending,
    selectedFile,
    setCoverPending: setCoverMutation.isPending,
    setForm,
    setIsCover,
    setKeywordsText,
    setMediaTitle,
    setMediaType,
    setSelectedFile,
    setStatus,
    status,
    uploadPending: uploadMutation.isPending,
  } as const;
}
