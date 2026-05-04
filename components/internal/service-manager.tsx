"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { FiPlus, FiSave, FiTrash2 } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  createInternalService,
  deleteInternalService,
  getInternalDestinations,
  getInternalServiceProviders,
  getInternalServices,
  updateInternalService,
  type ApiError,
} from "@/lib/client/api-client";
import { serviceCatalogMutationSchema, type InternalDestination, type InternalServiceCatalog, type ServiceCatalogMutationRequest } from "@/lib/shared/internal";

import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

const initialForm: ServiceCatalogMutationRequest = {
  basePrice: "0",
  currency: "VND",
  destinationId: "",
  description: "",
  name: "",
  providerId: null,
  serviceType: "transport",
  status: "draft",
};

function buildFormFromService(service: InternalServiceCatalog): ServiceCatalogMutationRequest {
  return {
    basePrice: service.basePrice,
    currency: service.currency,
    destinationId: service.destinationId,
    description: service.description ?? "",
    name: service.name,
    providerId: service.providerId,
    serviceType: service.serviceType,
    status: service.status,
  };
}

export function ServiceManager() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [destinationId, setDestinationId] = useState("");
  const [editingService, setEditingService] = useState<InternalServiceCatalog | null>(null);
  const [form, setForm] = useState<ServiceCatalogMutationRequest>(initialForm);
  const [pendingDeleteService, setPendingDeleteService] = useState<InternalServiceCatalog | null>(null);

  const destinationsQuery = useQuery({
    queryKey: ["internal", "destination-options"] as const,
    queryFn: () => getInternalDestinations(),
  });
  const providersQuery = useQuery({
    enabled: Boolean(form.serviceType),
    queryKey: ["internal", "service-providers", form.serviceType] as const,
    queryFn: () => getInternalServiceProviders(form.serviceType),
  });
  const servicesQuery = useQuery({
    enabled: Boolean(destinationId),
    queryKey: useMemo(() => ["internal", "services", destinationId] as const, [destinationId]),
    queryFn: () => getInternalServices(destinationId),
  });

  const saveMutation = useMutation({
    mutationFn: (input: ServiceCatalogMutationRequest) =>
      editingService
        ? updateInternalService(editingService.destinationId, editingService.serviceType, editingService.serviceId, input)
        : createInternalService(input),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "services"] });
      setEditingService(response.service);
      setForm(buildFormFromService(response.service));
      showToast({
        message: "Dịch vụ đã được lưu.",
        title: "Lưu thành công",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể lưu dịch vụ.",
        title: "Lưu chưa thành công",
        variant: "error",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ service }: { service: InternalServiceCatalog }) =>
      deleteInternalService(service.destinationId, service.serviceType, service.serviceId),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "services"] });
      setPendingDeleteService(null);
      if (editingService?.serviceId === variables.service.serviceId) {
        setEditingService(null);
        setForm(initialForm);
      }
      showToast({
        message: "Dịch vụ đã bị xóa.",
        title: "Đã xóa",
        variant: "success",
      });
    },
  });

  const destinations = destinationsQuery.data?.destinations ?? [];
  const services = servicesQuery.data?.services ?? [];
  const destinationOptions = destinations.map((destination: InternalDestination) => ({
    label: `${destination.name} - ${destination.city}`,
    value: destination.destinationId,
  }));
  const providerOptions = providersQuery.data?.providers.map((provider) => ({
    label: `${provider.providerName} - ${provider.region}`,
    value: provider.providerId,
  })) ?? [];
  const serviceStatusOptions = [
    { label: "draft", value: "draft" },
    { label: "published", value: "published" },
    { label: "archived", value: "archived" },
  ];

  const startEdit = (service: InternalServiceCatalog) => {
    setEditingService(service);
    setDestinationId(service.destinationId);
    setForm(buildFormFromService(service));
  };

  const resetForm = () => {
    setEditingService(null);
    setForm((current) => ({
      ...initialForm,
      destinationId: destinationId || current.destinationId,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = serviceCatalogMutationSchema.safeParse({
      ...form,
      destinationId,
    });

    if (!parsed.success) {
      showToast({
        message: parsed.error.issues[0]?.message ?? "Dữ liệu dịch vụ không hợp lệ.",
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
            Dịch vụ mới
          </button>
        }
        description="Quản lý dịch vụ đi kèm theo từng địa điểm, phục vụ gói tour và lookup ScyllaDB."
        title="Quản lý dịch vụ đi kèm"
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <InternalPanel className="p-4">
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">
            {editingService ? "Cập nhật dịch vụ" : "Tạo dịch vụ"}
          </h3>
          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <SelectField
              disabled={Boolean(editingService)}
              label="Chọn địa điểm"
              name="service-destination"
              onValueChange={(nextDestinationId) => {
                setDestinationId(nextDestinationId);
                setForm((current) => ({ ...current, destinationId: nextDestinationId }));
              }}
              options={destinationOptions}
              placeholder="Chọn địa điểm"
              value={destinationId}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Loại dịch vụ</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.serviceType} onChange={(event) => setForm((current) => ({ ...current, serviceType: event.target.value }))} />
              </label>
              <SelectField
                label="Nhà cung cấp"
                name="service-provider"
                onValueChange={(value) => setForm((current) => ({ ...current, providerId: value || null }))}
                options={providerOptions}
                placeholder="Tự nhập hoặc bỏ trống"
                value={form.providerId ?? ""}
              />
              <label className="space-y-2">
                <span className="text-sm font-semibold">Tên dịch vụ</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <SelectField
                label="Trạng thái"
                name="service-status"
                onValueChange={(value) => setForm((current) => ({ ...current, status: value as ServiceCatalogMutationRequest["status"] }))}
                options={serviceStatusOptions}
                placeholder="Chọn trạng thái"
                value={form.status}
              />
              <label className="space-y-2">
                <span className="text-sm font-semibold">Giá</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.basePrice} onChange={(event) => setForm((current) => ({ ...current, basePrice: event.target.value }))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Tiền tệ</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} />
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Mô tả</span>
              <textarea className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70" disabled={saveMutation.isPending || !destinationId} type="submit">
                <FiSave size={17} />
                Lưu dịch vụ
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
              <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Danh sách dịch vụ</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
                Hiển thị dịch vụ theo từng địa điểm đã chọn.
              </p>
            </div>
            <StatusPill value={services.length > 0 ? "published" : "draft"} />
          </div>

          {!destinationId ? (
            <div className="mt-4">
              <EmptyState message="Chọn một địa điểm để xem và quản lý dịch vụ đi kèm." />
            </div>
          ) : services.length === 0 ? (
            <div className="mt-4">
              <EmptyState message="Chưa có dịch vụ nào cho địa điểm này." />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {services.map((service) => (
                <article className="rounded-2xl border border-slate-200 p-3 dark:border-neutral-800" key={service.serviceId}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950 dark:text-neutral-50">{service.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
                        {service.serviceType} - {service.currency} {Number(service.basePrice).toLocaleString("vi-VN")}
                      </p>
                    </div>
                    <StatusPill value={service.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-neutral-400">{service.description ?? "Không có mô tả."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900" onClick={() => startEdit(service)} type="button">
                      Sửa
                    </button>
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40" disabled={archiveMutation.isPending} onClick={() => setPendingDeleteService(service)} type="button">
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
        confirmLabel="Xóa dịch vụ"
        description="Hành động này sẽ xóa dịch vụ khỏi địa điểm và không thể hoàn tác từ giao diện."
        open={pendingDeleteService !== null}
        onCancel={() => setPendingDeleteService(null)}
        onConfirm={() => {
          if (pendingDeleteService) {
            archiveMutation.mutate({ service: pendingDeleteService });
          }
        }}
        title="Xóa dịch vụ?"
      />
    </div>
  );
}
