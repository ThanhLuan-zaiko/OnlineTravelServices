"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FiArchive, FiEdit2, FiPlus, FiSave } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  archiveInternalTour,
  createInternalTour,
  getInternalDestinations,
  getInternalTours,
  getInternalVehicleCatalog,
  updateInternalTour,
  type ApiError,
} from "@/lib/client/api-client";
import {
  tourMutationSchema,
  type InternalDestination,
  type InternalTour,
  type InternalVehicleCatalogItem,
  type TourMutationRequest,
} from "@/lib/shared/internal";

import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

const initialForm: TourMutationRequest = {
  basePrice: "0",
  category: "",
  currency: "VND",
  destinationId: "",
  destinationName: "",
  durationDays: 1,
  durationNights: 0,
  excludedServices: [],
  includedServices: [],
  maxGuests: 10,
  minGuests: 1,
  slug: "",
  status: "draft",
  summary: "",
  title: "",
  tourType: "package",
  vipOnly: false,
  vehicleCapacity: 0,
  vehicleCatalogId: "",
  vehicleCatalogLabel: "",
  vehicleModel: "",
  vehicleType: "",
};

function money(value: string) {
  return Number(value).toLocaleString("vi-VN");
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toDatetimeValue(value: string | null) {
  if (!value) {
    return "";
  }

  return value.slice(0, 16);
}

export function TourManager() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [editingTour, setEditingTour] = useState<InternalTour | null>(null);
  const [form, setForm] = useState<TourMutationRequest>(initialForm);
  const [includedText, setIncludedText] = useState("");
  const [excludedText, setExcludedText] = useState("");
  const destinationsQuery = useQuery({
    queryKey: ["internal", "destination-options"] as const,
    queryFn: () => getInternalDestinations(),
  });
  const vehicleCatalogQuery = useQuery({
    queryKey: ["internal", "vehicle-catalog"] as const,
    queryFn: () => getInternalVehicleCatalog(),
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingArchiveTourId, setPendingArchiveTourId] = useState<string | null>(null);
  const { showToast } = useToast();
  const queryKey = useMemo(() => ["internal", "tours", status] as const, [status]);
  const toursQuery = useQuery({
    queryKey,
    queryFn: () => getInternalTours(status || undefined),
  });
  const saveMutation = useMutation({
    mutationFn: (input: TourMutationRequest) =>
      editingTour ? updateInternalTour(editingTour.tourId, input) : createInternalTour(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "tours"] });
      setEditingTour(null);
      setForm(initialForm);
      setIncludedText("");
      setExcludedText("");
      showToast({
        message: "Dữ liệu tour đã được lưu.",
        title: "Lưu thành công",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể lưu tour.",
        title: "Lưu chưa thành công",
        variant: "error",
      });
    },
  });
  const archiveMutation = useMutation({
    mutationFn: archiveInternalTour,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "tours"] });
      setPendingArchiveTourId(null);
      showToast({
        message: "Tour đã chuyển sang archived.",
        title: "Đã lưu trữ",
        variant: "success",
      });
    },
  });
  const tours = toursQuery.data?.tours ?? [];
  const destinations = destinationsQuery.data?.destinations ?? [];
  const vehicleCatalog = vehicleCatalogQuery.data?.catalog ?? [];
  const destinationOptions = destinations.map((destination: InternalDestination) => ({
    label: `${destination.name} - ${destination.city}`,
    value: destination.destinationId,
  }));
  const vehicleCatalogOptions = vehicleCatalog.map((option: InternalVehicleCatalogItem) => ({
    label: option.label,
    value: option.vehicleCatalogId,
  }));
  const statusOptions = [
    { label: "draft", value: "draft" },
    { label: "published", value: "published" },
    { label: "archived", value: "archived" },
  ];

  const startEdit = (tour: InternalTour) => {
    setEditingTour(tour);
    setForm({
      basePrice: tour.basePrice,
      category: tour.category,
      currency: tour.currency,
      destinationId: tour.destinationId,
      destinationName: tour.destinationName,
      durationDays: tour.durationDays,
      durationNights: tour.durationNights,
      excludedServices: tour.excludedServices,
      includedServices: tour.includedServices,
      maxGuests: tour.maxGuests,
      minGuests: tour.minGuests,
      slug: tour.slug,
      status: tour.status,
      summary: tour.summary,
      title: tour.title,
      tourType: tour.tourType,
      vipOnly: tour.vipOnly,
      vehicleCapacity: tour.vehicleCapacity,
      vehicleCatalogId: tour.vehicleCatalogId,
      vehicleCatalogLabel: tour.vehicleCatalogLabel,
      vehicleModel: tour.vehicleModel,
      vehicleType: tour.vehicleType,
    });
    setIncludedText(tour.includedServices.join("\n"));
    setExcludedText(tour.excludedServices.join("\n"));
  };

  const updateForm = (key: keyof TourMutationRequest, value: unknown) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = tourMutationSchema.safeParse({
      ...form,
      excludedServices: splitLines(excludedText),
      includedServices: splitLines(includedText),
    });

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Dữ liệu tour không hợp lệ.");
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
            onClick={() => {
              setEditingTour(null);
              setForm(initialForm);
              setIncludedText("");
              setExcludedText("");
            }}
            type="button"
          >
            <FiPlus size={17} />
            Tour mới
          </button>
        }
        description="Quản lý thông tin tour, trạng thái xuất bản và các projection lookup phục vụ truy vấn ScyllaDB."
        title="Quản lý thông tin tour"
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr]">
        <InternalPanel className="p-4">
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">
            {editingTour ? "Cập nhật tour" : "Tạo tour"}
          </h3>
          <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                className="md:col-span-2"
                label="Chọn địa điểm từ danh mục"
                name="tour-destination"
                onValueChange={(value) => {
                  const selected = destinations.find((destination: InternalDestination) => destination.destinationId === value);

                  if (!selected) {
                    return;
                  }

                  setForm((current) => ({
                    ...current,
                    destinationId: selected.destinationId,
                    destinationName: selected.name,
                  }));
                }}
                options={destinationOptions}
                placeholder="Chọn địa điểm đã có"
                value={form.destinationId}
              />
              <SelectField
                className="md:col-span-2"
                label="Chọn phương tiện từ danh mục"
                name="tour-vehicle-catalog"
                onValueChange={(value) => {
                  const selectedVehicle = vehicleCatalog.find((item: InternalVehicleCatalogItem) => item.vehicleCatalogId === value);

                  if (!selectedVehicle) {
                    return;
                  }

                  setForm((current) => ({
                    ...current,
                    vehicleCapacity: selectedVehicle.vehicleCapacity,
                    vehicleCatalogId: selectedVehicle.vehicleCatalogId,
                    vehicleCatalogLabel: selectedVehicle.label,
                    vehicleModel: selectedVehicle.vehicleModel,
                    vehicleType: selectedVehicle.vehicleType,
                  }));
                }}
                options={vehicleCatalogOptions}
                placeholder="Chọn phương tiện"
                value={form.vehicleCatalogId}
              />
              {vehicleCatalog.length === 0 ? (
                <p className="md:col-span-2 text-sm text-amber-700 dark:text-amber-300">
                  Chưa có phương tiện trong danh mục. Tạo một mục ở trang danh mục phương tiện trước.
                </p>
              ) : null}
              <label className="space-y-2">
                <span className="text-sm font-semibold">Tên tour</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.title} onChange={(event) => updateForm("title", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Slug</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.slug} onChange={(event) => updateForm("slug", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Destination ID</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.destinationId} onChange={(event) => updateForm("destinationId", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Điểm đến</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.destinationName} onChange={(event) => updateForm("destinationName", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Danh mục</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.category} onChange={(event) => updateForm("category", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Loại tour</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.tourType} onChange={(event) => updateForm("tourType", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Loại phương tiện</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.vehicleType} onChange={(event) => updateForm("vehicleType", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Tên phương tiện</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.vehicleCatalogLabel} onChange={(event) => updateForm("vehicleCatalogLabel", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Dòng xe</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.vehicleModel} onChange={(event) => updateForm("vehicleModel", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Số chỗ ngồi</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={form.vehicleCapacity} onChange={(event) => updateForm("vehicleCapacity", Number(event.target.value))} />
              </label>
              <SelectField
                label="Trạng thái"
                name="tour-status"
                onValueChange={(value) => updateForm("status", value)}
                options={statusOptions}
                placeholder="Chọn trạng thái"
                value={form.status}
              />
              <label className="space-y-2">
                <span className="text-sm font-semibold">Giá cơ bản</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.basePrice} onChange={(event) => updateForm("basePrice", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Tiền tệ</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.currency} onChange={(event) => updateForm("currency", event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Số ngày</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={form.durationDays} onChange={(event) => updateForm("durationDays", Number(event.target.value))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Số đêm</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={form.durationNights} onChange={(event) => updateForm("durationNights", Number(event.target.value))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Khách tối thiểu</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={form.minGuests} onChange={(event) => updateForm("minGuests", Number(event.target.value))} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Khách tối đa</span>
                <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={form.maxGuests} onChange={(event) => updateForm("maxGuests", Number(event.target.value))} />
              </label>
            </div>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold dark:border-neutral-800">
              <input checked={form.vipOnly} onChange={(event) => updateForm("vipOnly", event.target.checked)} type="checkbox" />
              Chỉ dành cho VIP
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold">Tóm tắt</span>
              <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={form.summary ?? ""} onChange={(event) => updateForm("summary", event.target.value)} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Dịch vụ bao gồm</span>
                <textarea className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={includedText} onChange={(event) => setIncludedText(event.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Dịch vụ không bao gồm</span>
                <textarea className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={excludedText} onChange={(event) => setExcludedText(event.target.value)} />
              </label>
            </div>
            {formError ? <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{formError}</p> : null}
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70" disabled={saveMutation.isPending} type="submit">
              <FiSave size={17} />
              {saveMutation.isPending ? "Đang lưu" : "Lưu tour"}
            </button>
          </form>
          <p className="mt-3 hidden text-xs text-slate-500 dark:text-neutral-500">{toDatetimeValue(editingTour?.publishedAt ?? null)}</p>
        </InternalPanel>

        <InternalPanel className="p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Danh sách tour</h3>
            <SelectField
              buttonClassName="h-10"
              className="min-w-[220px]"
              label="Lọc trạng thái"
              name="tour-status-filter"
              onValueChange={setStatus}
              options={statusOptions}
              placeholder="Tất cả trạng thái"
              value={status}
            />
          </div>
          {tours.length === 0 ? (
            <EmptyState message={toursQuery.isLoading ? "Đang tải tour..." : "Chưa có tour phù hợp bộ lọc."} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500 dark:text-neutral-500">
                  <tr>
                    <th className="px-3 py-3">Tour</th>
                    <th className="px-3 py-3">Điểm đến</th>
                    <th className="px-3 py-3">Phương tiện</th>
                    <th className="px-3 py-3">Giá</th>
                    <th className="px-3 py-3">Trạng thái</th>
                    <th className="px-3 py-3">Cập nhật</th>
                    <th className="px-3 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-neutral-900">
                  {tours.map((tour) => (
                    <tr key={tour.tourId}>
                      <td className="px-3 py-3">
                        <Link className="font-semibold text-slate-950 hover:text-sky-700 dark:text-neutral-50 dark:hover:text-sky-300" href={`/internal/tours/${tour.tourId}`}>
                          {tour.title}
                        </Link>
                        <p className="mt-1 text-xs text-slate-500">{tour.slug}</p>
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">{tour.destinationName}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">
                        <p className="font-medium text-slate-900 dark:text-neutral-100">{tour.vehicleCatalogLabel}</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">{tour.vehicleType}</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">{tour.vehicleModel}</p>
                        <p className="text-xs text-slate-500 dark:text-neutral-400">{tour.vehicleCapacity} chỗ</p>
                      </td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">{money(tour.basePrice)} {tour.currency}</td>
                      <td className="px-3 py-3"><StatusPill value={tour.status} /></td>
                      <td className="px-3 py-3 text-slate-600 dark:text-neutral-400">{new Date(tour.updatedAt).toLocaleDateString("vi-VN")}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900" onClick={() => startEdit(tour)} type="button" aria-label="Sửa tour">
                            <FiEdit2 size={16} />
                          </button>
                          <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900" disabled={archiveMutation.isPending || tour.status === "archived"} onClick={() => setPendingArchiveTourId(tour.tourId)} type="button" aria-label="Lưu trữ tour">
                            <FiArchive size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </InternalPanel>
      </div>

      <ConfirmModal
        confirmLabel="Lưu trữ tour"
        description="Tour sẽ chuyển sang archived và không còn xuất hiện trong luồng vận hành chính."
        open={pendingArchiveTourId !== null}
        onCancel={() => setPendingArchiveTourId(null)}
        onConfirm={() => {
          if (pendingArchiveTourId) {
            archiveMutation.mutate(pendingArchiveTourId);
          }
        }}
        title="Lưu trữ tour?"
      />
    </div>
  );
}
