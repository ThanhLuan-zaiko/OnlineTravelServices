"use client";

import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { FiImage, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";

import { ImageDropzone } from "@/components/ui/image-dropzone";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  createInternalVehicleCatalog,
  deleteInternalVehicleCatalog,
  deleteInternalVehicleCatalogImage,
  getInternalVehicleCatalog,
  updateInternalVehicleCatalog,
  uploadInternalVehicleCatalogImage,
  type ApiError,
} from "@/lib/client/api-client";
import {
  type InternalVehicleCatalogItem,
  vehicleCatalogMutationSchema,
  type VehicleCatalogMutationRequest,
} from "@/lib/shared/internal";

import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

const initialForm: VehicleCatalogMutationRequest = {
  label: "",
  status: "active",
  vehicleCapacity: 16,
  vehicleModel: "",
  vehicleType: "bus",
};

function buildForm(item: InternalVehicleCatalogItem): VehicleCatalogMutationRequest {
  return {
    label: item.label,
    status: item.status,
    vehicleCapacity: item.vehicleCapacity,
    vehicleModel: item.vehicleModel,
    vehicleType: item.vehicleType,
  };
}

function imageFolderLabel(url: string | null) {
  if (!url) {
    return "";
  }

  return url.split("/").slice(0, 4).join("/");
}

export function VehicleCatalogManager() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [status, setStatus] = useState("");
  const [editingItem, setEditingItem] = useState<InternalVehicleCatalogItem | null>(null);
  const [form, setForm] = useState<VehicleCatalogMutationRequest>(initialForm);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<InternalVehicleCatalogItem | null>(null);
  const [pendingDeleteImage, setPendingDeleteImage] = useState<InternalVehicleCatalogItem | null>(null);

  const catalogQuery = useQuery({
    queryKey: ["internal", "vehicle-catalog", status] as const,
    queryFn: () => getInternalVehicleCatalog(status || undefined),
  });

  const saveMutation = useMutation({
    mutationFn: (input: VehicleCatalogMutationRequest) =>
      editingItem ? updateInternalVehicleCatalog(editingItem.vehicleCatalogId, input) : createInternalVehicleCatalog(input),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      setEditingItem(response.catalogItem);
      setForm(buildForm(response.catalogItem));
      setSelectedFile(null);
      showToast({
        message: "Danh mục phương tiện đã được lưu.",
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

  const deleteMutation = useMutation({
    mutationFn: (item: InternalVehicleCatalogItem) => deleteInternalVehicleCatalog(item.vehicleCatalogId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      setEditingItem(null);
      setForm(initialForm);
      setSelectedFile(null);
      setPendingDeleteItem(null);
      showToast({
        message: "Danh mục phương tiện đã bị xóa.",
        title: "Đã xóa",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể xóa danh mục phương tiện.",
        title: "Xóa chưa thành công",
        variant: "error",
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async () => {
      if (!editingItem || !selectedFile) {
        throw new Error("Vui lòng chọn ảnh phương tiện.");
      }

      return uploadInternalVehicleCatalogImage(editingItem.vehicleCatalogId, selectedFile);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      setEditingItem(response.catalogItem);
      setForm(buildForm(response.catalogItem));
      setSelectedFile(null);
      showToast({
        message: "Ảnh phương tiện đã được cập nhật.",
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

  const deleteImageMutation = useMutation({
    mutationFn: (item: InternalVehicleCatalogItem) => deleteInternalVehicleCatalogImage(item.vehicleCatalogId),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "vehicle-catalog"] });
      setEditingItem(response.catalogItem);
      setForm(buildForm(response.catalogItem));
      setPendingDeleteImage(null);
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

  const catalog = catalogQuery.data?.catalog ?? [];

  const startEdit = (item: InternalVehicleCatalogItem) => {
    setEditingItem(item);
    setForm(buildForm(item));
    setSelectedFile(null);
  };

  const resetForm = () => {
    setEditingItem(null);
    setForm(initialForm);
    setSelectedFile(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = vehicleCatalogMutationSchema.safeParse(form);

    if (!parsed.success) {
      showToast({
        message: parsed.error.issues[0]?.message ?? "Dữ liệu phương tiện không hợp lệ.",
        title: "Kiểm tra lại dữ liệu",
        variant: "error",
      });
      return;
    }

    saveMutation.mutate(parsed.data);
  };

  return (
    <div className="space-y-5">
      <InternalPageHeader
        action={
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 dark:from-sky-400 dark:via-cyan-400 dark:to-emerald-400 dark:text-slate-950"
            onClick={resetForm}
            type="button"
          >
            <FiPlus size={17} />
            Phương tiện mới
          </button>
        }
        description="Quản lý danh mục phương tiện để nhân viên chọn sẵn khi tạo tour, đồng bộ số chỗ ngồi và thêm ảnh minh chứng."
        title="Danh mục phương tiện"
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <InternalPanel className="p-4">
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">
            {editingItem ? "Cập nhật phương tiện" : "Tạo phương tiện"}
          </h3>
          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold">Tên hiển thị</span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                  value={form.label}
                  onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Loại phương tiện</span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                  value={form.vehicleType}
                  onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Dòng xe</span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                  value={form.vehicleModel}
                  onChange={(event) => setForm((current) => ({ ...current, vehicleModel: event.target.value }))}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Số chỗ ngồi</span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                  min={1}
                  type="number"
                  value={form.vehicleCapacity}
                  onChange={(event) => setForm((current) => ({ ...current, vehicleCapacity: Number(event.target.value) }))}
                />
              </label>
              <SelectField
                label="Trạng thái"
                name="vehicle-catalog-status"
                onValueChange={(value) => setForm((current) => ({ ...current, status: value as VehicleCatalogMutationRequest["status"] }))}
                options={[
                  { label: "active", value: "active" },
                  { label: "inactive", value: "inactive" },
                ]}
                placeholder="Chọn trạng thái"
                value={form.status}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                disabled={saveMutation.isPending}
                type="submit"
              >
                <FiSave size={17} />
                Lưu phương tiện
              </button>
              <button
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                onClick={resetForm}
                type="button"
              >
                Làm mới
              </button>
            </div>
          </form>

          {editingItem ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <FiImage className="text-slate-400" size={16} />
                <h4 className="text-sm font-semibold text-slate-950 dark:text-neutral-50">Ảnh phương tiện</h4>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                Tải ảnh thực tế của xe để làm minh chứng cho danh mục.
              </p>
              <div className="mt-3 grid gap-3">
                <ImageDropzone disabled={uploadImageMutation.isPending} file={selectedFile} label="Chọn file ảnh" onFileChange={setSelectedFile} />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900"
                    disabled={!selectedFile || uploadImageMutation.isPending}
                    onClick={() => uploadImageMutation.mutate()}
                    type="button"
                  >
                    <FiImage size={16} />
                    Tải ảnh lên
                  </button>
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                    disabled={!editingItem.imageUrl || deleteImageMutation.isPending}
                    onClick={() => setPendingDeleteImage(editingItem)}
                    type="button"
                  >
                    <FiTrash2 size={16} />
                    Xóa ảnh
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </InternalPanel>

        <InternalPanel className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Danh sách phương tiện</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Danh mục này được dùng trực tiếp trong form tạo tour.</p>
            </div>
            <SelectField
              buttonClassName="h-10"
              className="min-w-[220px]"
              label="Lọc trạng thái"
              name="vehicle-catalog-filter-status"
              onValueChange={setStatus}
              options={[
                { label: "active", value: "active" },
                { label: "inactive", value: "inactive" },
              ]}
              placeholder="Tất cả"
              value={status}
            />
          </div>

          {catalog.length === 0 ? (
            <div className="mt-4">
              <EmptyState message={catalogQuery.isLoading ? "Đang tải danh mục phương tiện..." : "Chưa có phương tiện nào."} />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {catalog.map((item) => (
                <article className="rounded-2xl border border-slate-200 p-3 dark:border-neutral-800" key={item.vehicleCatalogId}>
                  <div className="flex items-start gap-3">
                    {item.thumbnailUrl ? (
                      <Image alt={item.label} className="h-20 w-20 rounded-xl object-cover" height={80} src={item.thumbnailUrl} width={80} />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-slate-300 text-[10px] text-slate-400 dark:border-neutral-800">
                        Chưa có ảnh
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">{item.label}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                            {item.vehicleType} - {item.vehicleModel}
                          </p>
                        </div>
                        <StatusPill value={item.status} />
                      </div>
                      {item.imageUrl ? <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">{imageFolderLabel(item.imageUrl)}</p> : null}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-neutral-400">
                    <p>Số chỗ: {item.vehicleCapacity}</p>
                    <p>ID: {item.vehicleCatalogId}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
                      onClick={() => startEdit(item)}
                      type="button"
                    >
                      Sửa
                    </button>
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40"
                      disabled={deleteMutation.isPending}
                      onClick={() => setPendingDeleteItem(item)}
                      type="button"
                    >
                      <FiTrash2 size={14} />
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </InternalPanel>
      </div>

      <ConfirmModal
        confirmLabel="Xóa danh mục"
        description="Danh mục phương tiện sẽ bị xóa khỏi hệ thống."
        open={pendingDeleteItem !== null}
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={() => {
          if (pendingDeleteItem) {
            deleteMutation.mutate(pendingDeleteItem);
          }
        }}
        title="Xóa danh mục phương tiện?"
      />

      <ConfirmModal
        confirmLabel="Xóa ảnh"
        description="Ảnh phương tiện sẽ bị xóa khỏi storage và không thể hoàn tác."
        open={pendingDeleteImage !== null}
        onCancel={() => setPendingDeleteImage(null)}
        onConfirm={() => {
          if (pendingDeleteImage) {
            deleteImageMutation.mutate(pendingDeleteImage);
          }
        }}
        title="Xóa ảnh phương tiện?"
      />
    </div>
  );
}
