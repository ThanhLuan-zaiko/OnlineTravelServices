"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { useToast } from "@/components/ui/toast";
import {
  archiveInternalVehicleCatalog,
  createInternalVehicleCatalog,
  deleteInternalVehicleCatalogMedia,
  getInternalVehicleCatalog,
  getInternalVehicleCatalogMedia,
  hardDeleteInternalVehicleCatalog,
  restoreInternalVehicleCatalog,
  setInternalVehicleCatalogMediaCover,
  updateInternalVehicleCatalog,
  uploadInternalVehicleCatalogMedia,
  type ApiError,
} from "@/lib/client/api-client";
import {
  type InternalVehicleCatalogItem,
  type InternalVehicleCatalogMedia,
  vehicleCatalogMutationSchema,
  type VehicleCatalogMutationRequest,
} from "@/lib/shared/internal";

import { useInternalUnsavedChanges } from "./internal-shell";

export type VehicleCatalogTab = "list" | "manage" | "media";

const initialForm: VehicleCatalogMutationRequest = {
  label: "",
  status: "active",
  vehicleCapacity: 16,
  vehicleModel: "",
  vehicleType: "bus",
};

type SelectedFilePreview = {
  file: File;
  previewUrl: string;
};

function buildForm(item: InternalVehicleCatalogItem): VehicleCatalogMutationRequest {
  return {
    label: item.label,
    status: item.status === "archived" ? item.archivedFromStatus ?? "inactive" : item.status,
    vehicleCapacity: item.vehicleCapacity,
    vehicleModel: item.vehicleModel,
    vehicleType: item.vehicleType,
  };
}

function toVehicleCatalogValidationErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.reduce<Partial<Record<keyof VehicleCatalogMutationRequest, string>>>((accumulator, issue) => {
    const key = issue.path[0];

    if (typeof key === "string") {
      accumulator[key as keyof VehicleCatalogMutationRequest] = issue.message;
    }

    return accumulator;
  }, {});
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function itemMatchesSearch(item: InternalVehicleCatalogItem, searchQuery: string) {
  const query = normalizeSearch(searchQuery);

  if (!query) {
    return true;
  }

  return [item.label, item.vehicleType, item.vehicleModel, item.vehicleCatalogId].some((value) => value.toLowerCase().includes(query));
}

export function useVehicleCatalogManager() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { showToast } = useToast();
  const { setIsDirty } = useInternalUnsavedChanges();
  const [status, setStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<InternalVehicleCatalogItem | null>(null);
  const [form, setForm] = useState<VehicleCatalogMutationRequest>(initialForm);
  const [savedForm, setSavedForm] = useState<VehicleCatalogMutationRequest>(initialForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof VehicleCatalogMutationRequest, string>>>({});
  const [selectedFilePreviews, setSelectedFilePreviews] = useState<SelectedFilePreview[]>([]);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<InternalVehicleCatalogItem | null>(null);
  const [pendingHardDeleteItem, setPendingHardDeleteItem] = useState<InternalVehicleCatalogItem | null>(null);
  const [pendingRestoreItem, setPendingRestoreItem] = useState<InternalVehicleCatalogItem | null>(null);
  const [pendingDeleteMedia, setPendingDeleteMedia] = useState<InternalVehicleCatalogMedia | null>(null);

  const selectedFiles = useMemo(() => selectedFilePreviews.map((item) => item.file), [selectedFilePreviews]);

  const setVehicleImageFiles = (nextFiles: File[]) => {
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

  const setVehicleImageFile = (nextFile: File | null) => {
    setVehicleImageFiles(nextFile ? [nextFile] : []);
  };

  const catalogQuery = useQuery({
    queryKey: ["internal", "vehicle-catalog", status] as const,
    queryFn: () => getInternalVehicleCatalog(status || undefined),
  });

  const archivedCatalogQuery = useQuery({
    queryKey: ["internal", "vehicle-catalog", "archived"] as const,
    queryFn: () => getInternalVehicleCatalog("archived"),
  });

  const mediaQuery = useQuery({
    enabled: Boolean(editingItem),
    queryKey: ["internal", "vehicle-catalog", editingItem?.vehicleCatalogId, "media"] as const,
    queryFn: () => getInternalVehicleCatalogMedia(editingItem?.vehicleCatalogId ?? ""),
  });

  const saveMutation = useMutation({
    mutationFn: async (input: VehicleCatalogMutationRequest) => {
      const savedResponse = editingItem
        ? await updateInternalVehicleCatalog(editingItem.vehicleCatalogId, input)
        : await createInternalVehicleCatalog(input);

      if (selectedFiles.length > 0) {
        const uploadResponse = await uploadInternalVehicleCatalogMedia(savedResponse.catalogItem.vehicleCatalogId, {
          files: selectedFiles,
          isCover: !savedResponse.catalogItem.imageUrl,
        });

        const cover = uploadResponse.media.find((item) => item.isCover) ?? uploadResponse.media[0];

        if (cover && !savedResponse.catalogItem.imageUrl) {
          return {
            catalogItem: {
              ...savedResponse.catalogItem,
              imageUrl: cover.mediaUrl,
              thumbnailUrl: cover.thumbnailUrl,
            },
            uploadedCount: selectedFiles.length,
          };
        }
      }

      return {
        catalogItem: savedResponse.catalogItem,
        uploadedCount: selectedFiles.length,
      };
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      const refreshed = await getInternalVehicleCatalogMedia(response.catalogItem.vehicleCatalogId);
      queryClient.setQueryData(["internal", "vehicle-catalog", response.catalogItem.vehicleCatalogId, "media"], refreshed);
      const nextForm = buildForm(response.catalogItem);

      setEditingItem(response.catalogItem);
      setForm(nextForm);
      setSavedForm(nextForm);
      setFormErrors({});
      setVehicleImageFiles([]);
      showToast({
        message:
          response.uploadedCount > 0
            ? `Danh mục và ${response.uploadedCount} ảnh phương tiện đã được lưu.`
            : "Danh mục phương tiện đã được lưu.",
        title: "Lưu thành công",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể lưu danh mục phương tiện.",
        title: "Lưu chưa thành công",
        variant: "error",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (item: InternalVehicleCatalogItem) => archiveInternalVehicleCatalog(item.vehicleCatalogId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      setEditingItem(null);
      setForm(initialForm);
      setSavedForm(initialForm);
      setFormErrors({});
      setVehicleImageFiles([]);
      setPendingDeleteItem(null);
      showToast({
        message: "Phương tiện đã được chuyển vào kho lưu trữ.",
        title: "Đã lưu trữ",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể lưu trữ phương tiện.",
        title: "Lưu trữ chưa thành công",
        variant: "error",
      });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (item: InternalVehicleCatalogItem) => hardDeleteInternalVehicleCatalog(item.vehicleCatalogId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      setPendingHardDeleteItem(null);
      showToast({
        message: "Phương tiện và toàn bộ ảnh vật lý đã bị xóa vĩnh viễn.",
        title: "Đã xóa vĩnh viễn",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể xóa vĩnh viễn phương tiện.",
        title: "Xóa chưa thành công",
        variant: "error",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (item: InternalVehicleCatalogItem) => restoreInternalVehicleCatalog(item.vehicleCatalogId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      setPendingRestoreItem(null);
      showToast({
        message: "Phương tiện đã được khôi phục về danh sách.",
        title: "Đã khôi phục",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể khôi phục phương tiện.",
        title: "Khôi phục chưa thành công",
        variant: "error",
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem || selectedFiles.length === 0) {
        throw new Error("Vui lòng chọn ảnh phương tiện.");
      }

      return uploadInternalVehicleCatalogMedia(editingItem.vehicleCatalogId, {
        files: selectedFiles,
        isCover: !editingItem.imageUrl,
      });
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog", editingItem?.vehicleCatalogId, "media"] });
      const cover = response.media.find((item) => item.isCover) ?? response.media[0];

      if (cover) {
        setEditingItem((current) =>
          current
            ? {
                ...current,
                imageUrl: current.imageUrl ?? cover.mediaUrl,
                thumbnailUrl: current.thumbnailUrl ?? cover.thumbnailUrl,
              }
            : current,
        );
      }

      setVehicleImageFiles([]);
      showToast({
        message: "Ảnh phương tiện đã được tải lên.",
        title: "Tải ảnh thành công",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể tải ảnh phương tiện.",
        title: "Upload chưa thành công",
        variant: "error",
      });
    },
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (media: InternalVehicleCatalogMedia) => deleteInternalVehicleCatalogMedia(media.vehicleCatalogId, media.mediaId),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog", editingItem?.vehicleCatalogId, "media"] });
      setEditingItem((current) =>
        current && current.imageUrl === response.media.mediaUrl
          ? {
              ...current,
              imageUrl: null,
              thumbnailUrl: null,
            }
          : current,
      );
      setPendingDeleteMedia(null);
      showToast({
        message: "Ảnh phương tiện đã được xóa.",
        title: "Đã xóa ảnh",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể xóa ảnh phương tiện.",
        title: "Xóa ảnh chưa thành công",
        variant: "error",
      });
    },
  });

  const setCoverMutation = useMutation({
    mutationFn: (media: InternalVehicleCatalogMedia) => setInternalVehicleCatalogMediaCover(media.vehicleCatalogId, media.mediaId),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog", editingItem?.vehicleCatalogId, "media"] });
      setEditingItem((current) =>
        current
          ? {
              ...current,
              imageUrl: response.media.mediaUrl,
              thumbnailUrl: response.media.thumbnailUrl,
            }
          : current,
      );
      showToast({
        message: "Ảnh đại diện đã được cập nhật.",
        title: "Đã đặt cover",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể đặt ảnh đại diện.",
        title: "Cập nhật chưa thành công",
        variant: "error",
      });
    },
  });

  const queryCatalog = catalogQuery.data?.catalog;
  const archivedQueryCatalog = archivedCatalogQuery.data?.catalog;
  const catalog = useMemo(() => queryCatalog ?? [], [queryCatalog]);
  const archivedCatalog = useMemo(() => archivedQueryCatalog ?? [], [archivedQueryCatalog]);
  const visibleCatalog = useMemo(() => catalog.filter((item) => itemMatchesSearch(item, searchQuery)), [catalog, searchQuery]);
  const visibleArchivedCatalog = useMemo(
    () => archivedCatalog.filter((item) => itemMatchesSearch(item, searchQuery)),
    [archivedCatalog, searchQuery],
  );
  const media = useMemo(() => mediaQuery.data?.media ?? [], [mediaQuery.data?.media]);
  const stats = useMemo(() => {
    const active = catalog.filter((item) => item.status === "active").length;
    const inactive = catalog.filter((item) => item.status === "inactive").length;
    const withImage = catalog.filter((item) => item.imageUrl).length;
    const totalCapacity = catalog.reduce((sum, item) => sum + item.vehicleCapacity, 0);

    return { active, archived: archivedCatalog.length, inactive, total: catalog.length, totalCapacity, withImage };
  }, [archivedCatalog.length, catalog]);

  const hasUnsavedChanges =
    JSON.stringify({
      form,
      selectedFileCount: selectedFiles.length,
    }) !==
    JSON.stringify({
      form: savedForm,
      selectedFileCount: 0,
    });

  useEffect(() => {
    setIsDirty(hasUnsavedChanges);

    return () => setIsDirty(false);
  }, [hasUnsavedChanges, setIsDirty]);

  useEffect(
    () => () => {
      for (const item of selectedFilePreviews) {
        URL.revokeObjectURL(item.previewUrl);
      }
    },
    [selectedFilePreviews],
  );

  const startEdit = (item: InternalVehicleCatalogItem, nextTab: VehicleCatalogTab = "manage") => {
    const nextForm = buildForm(item);

    setEditingItem(item);
    setForm(nextForm);
    setSavedForm(nextForm);
    setFormErrors({});
    setVehicleImageFiles([]);
    router.push(`/internal/vehicle-catalog/${nextTab}`);
  };

  const resetForm = () => {
    setEditingItem(null);
    setForm(initialForm);
    setSavedForm(initialForm);
    setFormErrors({});
    setVehicleImageFiles([]);
    router.push("/internal/vehicle-catalog/manage");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = vehicleCatalogMutationSchema.safeParse(form);

    if (!parsed.success) {
      setFormErrors(toVehicleCatalogValidationErrors(parsed.error.issues));
      showToast({
        message: parsed.error.issues[0]?.message ?? "Dữ liệu phương tiện không hợp lệ.",
        title: "Kiểm tra lại dữ liệu",
        variant: "error",
      });
      return;
    }

    setFormErrors({});
    saveMutation.mutate(parsed.data);
  };

  return {
    archivedCatalogQuery,
    archiveMutation,
    catalogQuery,
    deleteImageMutation: deleteMediaMutation,
    deleteMediaMutation,
    deleteMutation: archiveMutation,
    editingItem,
    form,
    formErrors,
    handleSubmit,
    hardDeleteMutation,
    media,
    mediaQuery,
    pendingDeleteImage: pendingDeleteMedia,
    pendingDeleteItem,
    pendingDeleteMedia,
    pendingHardDeleteItem,
    pendingRestoreItem,
    resetForm,
    restoreMutation,
    saveMutation,
    searchQuery,
    selectedFile: selectedFiles[0] ?? null,
    selectedFilePreviewUrl: selectedFilePreviews[0]?.previewUrl ?? null,
    selectedFilePreviews,
    selectedFiles,
    setCoverMutation,
    setForm,
    setPendingDeleteImage: setPendingDeleteMedia,
    setPendingDeleteItem,
    setPendingDeleteMedia,
    setPendingHardDeleteItem,
    setPendingRestoreItem,
    setSearchQuery,
    setSelectedFile: setVehicleImageFile,
    setSelectedFiles: setVehicleImageFiles,
    setStatus,
    startEdit,
    stats,
    status,
    uploadImageMutation,
    visibleArchivedCatalog,
    visibleCatalog,
  };
}
