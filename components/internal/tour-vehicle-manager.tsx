"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { FiPlus, FiSave, FiTrash2 } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  createInternalTourVehicle,
  deleteInternalTourVehicle,
  getInternalTourVehicles,
  updateInternalTourVehicle,
  type ApiError,
} from "@/lib/client/api-client";
import {
  tourVehicleMutationSchema,
  type InternalTourVehicle,
  type TourVehicleMutationRequest,
} from "@/lib/shared/internal";

import { EmptyState, InternalPanel, StatusPill } from "./internal-primitives";

const initialForm: TourVehicleMutationRequest = {
  capacity: 20,
  driverName: "",
  driverPhone: "",
  model: "",
  notes: "",
  plateNumber: "",
  status: "active",
  vehicleType: "bus",
};

function buildForm(vehicle: InternalTourVehicle): TourVehicleMutationRequest {
  return {
    capacity: vehicle.capacity,
    driverName: vehicle.driverName,
    driverPhone: vehicle.driverPhone,
    model: vehicle.model,
    notes: vehicle.notes ?? "",
    plateNumber: vehicle.plateNumber,
    status: vehicle.status,
    vehicleType: vehicle.vehicleType,
  };
}

export function TourVehicleManager({ tourId }: { tourId: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [editingVehicle, setEditingVehicle] = useState<InternalTourVehicle | null>(null);
  const [form, setForm] = useState<TourVehicleMutationRequest>(initialForm);
  const [pendingDeleteVehicle, setPendingDeleteVehicle] = useState<InternalTourVehicle | null>(null);

  const vehiclesQuery = useQuery({
    queryKey: ["internal", "tour-vehicles", tourId] as const,
    queryFn: () => getInternalTourVehicles(tourId),
  });

  const saveMutation = useMutation({
    mutationFn: (input: TourVehicleMutationRequest) =>
      editingVehicle ? updateInternalTourVehicle(tourId, editingVehicle.vehicleId, input) : createInternalTourVehicle(tourId, input),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "tour-vehicles", tourId] });
      setEditingVehicle(response.vehicle);
      setForm(buildForm(response.vehicle));
      showToast({
        message: "Phương tiện đã được lưu.",
        title: "Lưu thành công",
        variant: "success",
      });
    },
    onError: (error) => {
      showToast({
        message: (error as ApiError | undefined)?.message ?? "Không thể lưu phương tiện.",
        title: "Lưu chưa thành công",
        variant: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (vehicle: InternalTourVehicle) => deleteInternalTourVehicle(tourId, vehicle.vehicleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "tour-vehicles", tourId] });
      setEditingVehicle(null);
      setForm(initialForm);
      setPendingDeleteVehicle(null);
      showToast({
        message: "Phương tiện đã bị xóa.",
        title: "Đã xóa",
        variant: "success",
      });
    },
  });

  const vehicles = vehiclesQuery.data?.vehicles ?? [];
  const statusOptions = [
    { label: "active", value: "active" },
    { label: "inactive", value: "inactive" },
    { label: "maintenance", value: "maintenance" },
  ];

  const startEdit = (vehicle: InternalTourVehicle) => {
    setEditingVehicle(vehicle);
    setForm(buildForm(vehicle));
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setForm(initialForm);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = tourVehicleMutationSchema.safeParse(form);

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
    <InternalPanel className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-neutral-50">Phương tiện tour</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">
            Quản lý xe, tàu, máy bay hoặc bất kỳ phương tiện nào dùng cho tour.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
          onClick={resetForm}
          type="button"
        >
          <FiPlus size={16} />
          {editingVehicle ? "Tạo mới" : "Thêm phương tiện"}
        </button>
      </div>

      <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold">Loại phương tiện</span>
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.vehicleType} onChange={(event) => setForm((current) => ({ ...current, vehicleType: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Biển số</span>
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.plateNumber} onChange={(event) => setForm((current) => ({ ...current, plateNumber: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Dòng xe</span>
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Sức chứa</span>
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={form.capacity} onChange={(event) => setForm((current) => ({ ...current, capacity: Number(event.target.value) }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Tên tài xế</span>
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.driverName} onChange={(event) => setForm((current) => ({ ...current, driverName: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold">Số điện thoại</span>
            <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={form.driverPhone} onChange={(event) => setForm((current) => ({ ...current, driverPhone: event.target.value }))} />
          </label>
          <SelectField
            label="Trạng thái"
            name="tour-vehicle-status"
            onValueChange={(value) => setForm((current) => ({ ...current, status: value as TourVehicleMutationRequest["status"] }))}
            options={statusOptions}
            placeholder="Chọn trạng thái"
            value={form.status}
          />
        </div>

        <label className="space-y-2">
          <span className="text-sm font-semibold">Ghi chú</span>
          <textarea className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={form.notes ?? ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950" disabled={saveMutation.isPending} type="submit">
            <FiSave size={17} />
            Lưu phương tiện
          </button>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-900" onClick={resetForm} type="button">
            Làm mới
          </button>
        </div>
      </form>

      <div className="mt-5">
        {vehicles.length === 0 ? (
          <EmptyState message={vehiclesQuery.isLoading ? "Đang tải phương tiện..." : "Chưa có phương tiện nào cho tour này."} />
        ) : (
          <div className="space-y-3">
            {vehicles.map((vehicle) => (
              <article className="rounded-2xl border border-slate-200 p-3 dark:border-neutral-800" key={vehicle.vehicleId}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-neutral-50">{vehicle.vehicleType} - {vehicle.plateNumber}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{vehicle.model}</p>
                  </div>
                  <StatusPill value={vehicle.status} />
                </div>
                <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-neutral-400">
                  <p>Tài xế: {vehicle.driverName}</p>
                  <p>SĐT: {vehicle.driverPhone}</p>
                  <p>Sức chứa: {vehicle.capacity}</p>
                  {vehicle.notes ? <p>{vehicle.notes}</p> : null}
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold transition hover:bg-slate-50 dark:border-neutral-800 dark:hover:bg-neutral-900" onClick={() => startEdit(vehicle)} type="button">
                    Sửa
                  </button>
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-950 dark:text-rose-300 dark:hover:bg-rose-950/40" disabled={deleteMutation.isPending} onClick={() => setPendingDeleteVehicle(vehicle)} type="button">
                    <FiTrash2 size={14} />
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        confirmLabel="Xóa phương tiện"
        description="Phương tiện này sẽ bị xóa khỏi tour và không thể khôi phục từ giao diện."
        open={pendingDeleteVehicle !== null}
        onCancel={() => setPendingDeleteVehicle(null)}
        onConfirm={() => {
          if (pendingDeleteVehicle) {
            deleteMutation.mutate(pendingDeleteVehicle);
          }
        }}
        title="Xóa phương tiện?"
      />
    </InternalPanel>
  );
}
