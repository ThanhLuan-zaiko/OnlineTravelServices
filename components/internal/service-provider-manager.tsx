"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { FiPlus, FiSave, FiTrash2 } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  createInternalServiceProvider,
  deleteInternalServiceProvider,
  getInternalServiceProviders,
  updateInternalServiceProvider,
  type ApiError,
} from "@/lib/client/api-client";
import {
  serviceProviderMutationSchema,
  type InternalServiceProvider,
  type ServiceProviderMutationRequest,
} from "@/lib/shared/internal";

import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

const initialForm: ServiceProviderMutationRequest = {
  contractStatus: "draft",
  email: "",
  phone: "",
  providerName: "",
  rating: 0,
  region: "",
  serviceType: "transport",
  status: "active",
};

function buildForm(provider: InternalServiceProvider): ServiceProviderMutationRequest {
  return {
    contractStatus: provider.contractStatus,
    email: provider.email,
    phone: provider.phone,
    providerName: provider.providerName,
    rating: provider.rating,
    region: provider.region,
    serviceType: provider.serviceType,
    status: provider.status,
  };
}

export function ServiceProviderManager() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [serviceType, setServiceType] = useState("transport");
  const [editingProvider, setEditingProvider] = useState<InternalServiceProvider | null>(null);
  const [form, setForm] = useState<ServiceProviderMutationRequest>(initialForm);
  const [pendingDeleteProvider, setPendingDeleteProvider] = useState<InternalServiceProvider | null>(null);

  const providersQuery = useQuery({
    enabled: Boolean(serviceType),
    queryKey: ["internal", "service-providers", serviceType] as const,
    queryFn: () => getInternalServiceProviders(serviceType),
  });
  const contractStatusOptions = [
    { label: "draft", value: "draft" },
    { label: "active", value: "active" },
    { label: "expired", value: "expired" },
  ];
  const providerStatusOptions = [
    { label: "active", value: "active" },
    { label: "inactive", value: "inactive" },
    { label: "suspended", value: "suspended" },
  ];

  const saveMutation = useMutation({
    mutationFn: (input: ServiceProviderMutationRequest) =>
      editingProvider
        ? updateInternalServiceProvider(editingProvider.serviceType, editingProvider.providerId, input)
        : createInternalServiceProvider(input),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "service-providers", serviceType] });
      setEditingProvider(response.provider);
      setForm(buildForm(response.provider));
      showToast({
        message: "Nhà cung cấp đã được lưu.",
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

  const deleteMutation = useMutation({
    mutationFn: (provider: InternalServiceProvider) => deleteInternalServiceProvider(provider.serviceType, provider.providerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "service-providers", serviceType] });
      setEditingProvider(null);
      setForm(initialForm);
      setPendingDeleteProvider(null);
      showToast({
        message: "Nhà cung cấp đã bị xóa.",
        title: "Đã xóa",
        variant: "success",
      });
    },
  });

  const providers = providersQuery.data?.providers ?? [];

  const startEdit = (provider: InternalServiceProvider) => {
    setEditingProvider(provider);
    setServiceType(provider.serviceType);
    setForm(buildForm(provider));
  };

  const resetForm = () => {
    setEditingProvider(null);
    setForm({
      ...initialForm,
      serviceType,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = serviceProviderMutationSchema.safeParse({
      ...form,
      serviceType,
    });

    if (!parsed.success) {
      showToast({
        message: parsed.error.issues[0]?.message ?? "Dữ liệu nhà cung cấp không hợp lệ.",
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
            Nhà cung cấp mới
          </button>
        }
        description="Quản lý nhà cung cấp theo loại dịch vụ để gán vào dịch vụ đi kèm và chuẩn hóa dữ liệu admin."
        title="Quản lý nhà cung cấp dịch vụ"
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <InternalPanel className="p-4">
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">
            {editingProvider ? "Cập nhật nhà cung cấp" : "Tạo nhà cung cấp"}
          </h3>
          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <label className="space-y-2">
              <span className="text-sm font-semibold">Loại dịch vụ</span>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black"
                disabled={Boolean(editingProvider)}
                value={serviceType}
                onChange={(event) => {
                  setServiceType(event.target.value);
                  setForm((current) => ({ ...current, serviceType: event.target.value }));
                }}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Tên nhà cung cấp</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.providerName} onChange={(event) => setForm((current) => ({ ...current, providerName: event.target.value }))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Khu vực</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Số điện thoại</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Email</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Xếp hạng</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" step="0.1" type="number" value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: Number(event.target.value) }))} />
              </label>
              <SelectField
                label="Trạng thái hợp đồng"
                name="provider-contract-status"
                onValueChange={(value) => setForm((current) => ({ ...current, contractStatus: value as ServiceProviderMutationRequest["contractStatus"] }))}
                options={contractStatusOptions}
                placeholder="Chọn trạng thái"
                value={form.contractStatus}
              />
              <SelectField
                label="Trạng thái"
                name="provider-status"
                onValueChange={(value) => setForm((current) => ({ ...current, status: value as ServiceProviderMutationRequest["status"] }))}
                options={providerStatusOptions}
                placeholder="Chọn trạng thái"
                value={form.status}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70" disabled={saveMutation.isPending} type="submit">
                <FiSave size={17} />
                Lưu nhà cung cấp
              </button>
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900" onClick={resetForm} type="button">
                Làm mới
              </button>
            </div>
          </form>
        </InternalPanel>

        <InternalPanel className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Danh sách nhà cung cấp</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Lọc theo loại dịch vụ hiện tại.</p>
            </div>
            <StatusPill value={providers.length > 0 ? "published" : "draft"} />
          </div>

          {providers.length === 0 ? (
            <div className="mt-4">
              <EmptyState message="Chưa có nhà cung cấp cho loại dịch vụ này." />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {providers.map((provider) => (
                <article className="rounded-2xl border border-slate-200 p-3 dark:border-neutral-800" key={provider.providerId}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-neutral-50">{provider.providerName}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{provider.region}</p>
                    </div>
                    <StatusPill value={provider.status} />
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-neutral-400">
                    <p>{provider.email}</p>
                    <p>{provider.phone}</p>
                    <p>Loại: {provider.serviceType} | Hợp đồng: {provider.contractStatus} | Rating: {provider.rating.toFixed(1)}</p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900" onClick={() => startEdit(provider)} type="button">
                      Sửa
                    </button>
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40" disabled={deleteMutation.isPending} onClick={() => setPendingDeleteProvider(provider)} type="button">
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
        confirmLabel="Xóa nhà cung cấp"
        description="Hành động này sẽ xóa nhà cung cấp khỏi danh mục hiện tại."
        open={pendingDeleteProvider !== null}
        onCancel={() => setPendingDeleteProvider(null)}
        onConfirm={() => {
          if (pendingDeleteProvider) {
            deleteMutation.mutate(pendingDeleteProvider);
          }
        }}
        title="Xóa nhà cung cấp?"
      />
    </div>
  );
}
