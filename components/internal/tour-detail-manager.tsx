"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { FiArrowLeft, FiPlus, FiSave, FiTrash2 } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  createInternalSchedule,
  deleteInternalItineraryItem,
  deleteInternalSchedule,
  getInternalItinerary,
  getInternalSchedules,
  getInternalTour,
  upsertInternalItineraryItem,
  type ApiError,
} from "@/lib/client/api-client";
import {
  itineraryMutationSchema,
  scheduleMutationSchema,
  type InternalItineraryItem,
  type InternalSchedule,
  type ItineraryMutationRequest,
  type ScheduleMutationRequest,
} from "@/lib/shared/internal";

import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";
import { TourMediaManager } from "./tour-media-manager";
import { TourVehicleManager } from "./tour-vehicle-manager";

const scheduleInitial: ScheduleMutationRequest = {
  availableSlots: 20,
  bookedSlots: 0,
  currency: "VND",
  departureDate: "",
  departureTime: "08:00",
  guideStaffId: null,
  price: "0",
  status: "open",
};

const itineraryInitial: ItineraryMutationRequest = {
  dayNumber: 1,
  description: "",
  endTime: "",
  itemOrder: 1,
  locationName: "",
  serviceType: "",
  startTime: "",
  title: "",
};

export function TourDetailManager({ tourId }: { tourId: string }) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [scheduleForm, setScheduleForm] = useState<ScheduleMutationRequest>(scheduleInitial);
  const [itineraryForm, setItineraryForm] = useState<ItineraryMutationRequest>(itineraryInitial);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    | { kind: "schedule"; schedule: InternalSchedule }
    | { kind: "itinerary"; item: InternalItineraryItem }
    | null
  >(null);
  const tourQuery = useQuery({
    queryKey: ["internal", "tour", tourId],
    queryFn: () => getInternalTour(tourId),
  });
  const schedulesQuery = useQuery({
    queryKey: ["internal", "schedules", tourId],
    queryFn: () => getInternalSchedules(tourId),
  });
  const itineraryQuery = useQuery({
    queryKey: ["internal", "itinerary", tourId],
    queryFn: () => getInternalItinerary(tourId),
  });
  const scheduleMutation = useMutation({
    mutationFn: (input: ScheduleMutationRequest) => createInternalSchedule(tourId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "schedules", tourId] });
      setScheduleForm(scheduleInitial);
      showToast({ message: "Lịch khởi hành đã được lưu.", title: "Lưu thành công", variant: "success" });
    },
    onError: (mutationError) => showToast({ message: (mutationError as ApiError).message, title: "Không thể lưu lịch", variant: "error" }),
  });
  const itineraryMutation = useMutation({
    mutationFn: (input: ItineraryMutationRequest) => upsertInternalItineraryItem(tourId, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "itinerary", tourId] });
      setItineraryForm(itineraryInitial);
      showToast({ message: "Mục lịch trình đã được lưu.", title: "Lưu thành công", variant: "success" });
    },
    onError: (mutationError) => showToast({ message: (mutationError as ApiError).message, title: "Không thể lưu lịch trình", variant: "error" }),
  });
  const deleteScheduleMutation = useMutation({
    mutationFn: (schedule: InternalSchedule) => deleteInternalSchedule(tourId, schedule),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "schedules", tourId] });
      setPendingDelete(null);
    },
  });
  const deleteItineraryMutation = useMutation({
    mutationFn: (item: InternalItineraryItem) => deleteInternalItineraryItem(tourId, item),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "itinerary", tourId] });
      setPendingDelete(null);
    },
  });
  const tour = tourQuery.data?.tour;
  const schedules = schedulesQuery.data?.schedules ?? [];
  const itinerary = itineraryQuery.data?.items ?? [];
  const scheduleStatusOptions = [
    { label: "open", value: "open" },
    { label: "closed", value: "closed" },
    { label: "cancelled", value: "cancelled" },
  ];

  const submitSchedule = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = scheduleMutationSchema.safeParse(scheduleForm);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Lịch khởi hành không hợp lệ.");
      return;
    }

    scheduleMutation.mutate(parsed.data);
  };

  const submitItinerary = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsed = itineraryMutationSchema.safeParse(itineraryForm);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Lịch trình không hợp lệ.");
      return;
    }

    itineraryMutation.mutate(parsed.data);
  };

  return (
    <div className="space-y-5">
      <InternalPageHeader
        action={
          <Link className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold dark:border-neutral-800" href="/internal/tours">
            <FiArrowLeft size={17} />
            Về danh sách
          </Link>
        }
        description={
          tour
            ? `${tour.destinationName} - ${tour.durationDays} ngày ${tour.durationNights} đêm - ${tour.vehicleCatalogLabel} (${tour.vehicleCapacity} chỗ)`
            : "Quản lý lịch khởi hành và lịch trình chi tiết của tour."
        }
        title={tour?.title ?? "Chi tiết tour"}
      />

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{error}</p> : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <InternalPanel className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Lịch khởi hành</h3>
            <FiPlus className="text-slate-400" size={18} />
          </div>
          <form className="mt-4 grid gap-3" onSubmit={submitSchedule}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="date" value={scheduleForm.departureDate} onChange={(event) => setScheduleForm((current) => ({ ...current, departureDate: event.target.value }))} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" value={scheduleForm.departureTime} onChange={(event) => setScheduleForm((current) => ({ ...current, departureTime: event.target.value }))} />
              <SelectField
                label="Trạng thái"
                name="schedule-status"
                onValueChange={(value) => setScheduleForm((current) => ({ ...current, status: value as ScheduleMutationRequest["status"] }))}
                options={scheduleStatusOptions}
                placeholder="Chọn trạng thái"
                value={scheduleForm.status}
              />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Giá" value={scheduleForm.price} onChange={(event) => setScheduleForm((current) => ({ ...current, price: event.target.value }))} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={scheduleForm.availableSlots} onChange={(event) => setScheduleForm((current) => ({ ...current, availableSlots: Number(event.target.value) }))} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={scheduleForm.bookedSlots} onChange={(event) => setScheduleForm((current) => ({ ...current, bookedSlots: Number(event.target.value) }))} />
            </div>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white" disabled={scheduleMutation.isPending} type="submit">
              <FiSave size={17} />
              Lưu lịch khởi hành
            </button>
          </form>
          <div className="mt-5 space-y-2">
            {schedules.length === 0 ? (
              <EmptyState message={schedulesQuery.isLoading ? "Đang tải lịch..." : "Chưa có lịch khởi hành."} />
            ) : (
              schedules.map((schedule) => (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={schedule.scheduleId}>
                  <div>
                    <p className="text-sm font-semibold">{schedule.departureDate} - {schedule.departureTime}</p>
                    <p className="mt-1 text-xs text-slate-500">{schedule.bookedSlots}/{schedule.availableSlots + schedule.bookedSlots} chỗ</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill value={schedule.status} />
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-800" onClick={() => setPendingDelete({ kind: "schedule", schedule })} type="button" aria-label="Xóa lịch">
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </InternalPanel>

        <InternalPanel className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Lịch trình chi tiết</h3>
            <FiPlus className="text-slate-400" size={18} />
          </div>
          <form className="mt-4 grid gap-3" onSubmit={submitItinerary}>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={itineraryForm.dayNumber} onChange={(event) => setItineraryForm((current) => ({ ...current, dayNumber: Number(event.target.value) }))} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" type="number" value={itineraryForm.itemOrder} onChange={(event) => setItineraryForm((current) => ({ ...current, itemOrder: Number(event.target.value) }))} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black sm:col-span-2" placeholder="Tiêu đề" value={itineraryForm.title} onChange={(event) => setItineraryForm((current) => ({ ...current, title: event.target.value }))} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Địa điểm" value={itineraryForm.locationName ?? ""} onChange={(event) => setItineraryForm((current) => ({ ...current, locationName: event.target.value }))} />
              <input className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Loại dịch vụ" value={itineraryForm.serviceType ?? ""} onChange={(event) => setItineraryForm((current) => ({ ...current, serviceType: event.target.value }))} />
            </div>
            <textarea className="min-h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" placeholder="Mô tả" value={itineraryForm.description ?? ""} onChange={(event) => setItineraryForm((current) => ({ ...current, description: event.target.value }))} />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white" disabled={itineraryMutation.isPending} type="submit">
              <FiSave size={17} />
              Lưu mục lịch trình
            </button>
          </form>
          <div className="mt-5 space-y-2">
            {itinerary.length === 0 ? (
              <EmptyState message={itineraryQuery.isLoading ? "Đang tải lịch trình..." : "Chưa có mục lịch trình."} />
            ) : (
              itinerary.map((item) => (
                <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={`${item.dayNumber}-${item.itemOrder}`}>
                  <div>
                    <p className="text-sm font-semibold">Ngày {item.dayNumber}.{item.itemOrder} - {item.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.locationName ?? "Chưa có địa điểm"}</p>
                  </div>
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-neutral-800" onClick={() => setPendingDelete({ kind: "itinerary", item })} type="button" aria-label="Xóa mục">
                    <FiTrash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </InternalPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <TourMediaManager coverImageUrl={tour?.coverImageUrl ?? null} tour={tour} tourId={tourId} />
        <TourVehicleManager tourId={tourId} />
      </div>

      <ConfirmModal
        confirmLabel={pendingDelete?.kind === "itinerary" ? "Xóa mục" : "Xóa lịch"}
        description={
          pendingDelete?.kind === "itinerary"
            ? "Mục lịch trình sẽ bị xóa khỏi tour."
            : "Lịch khởi hành sẽ bị xóa khỏi tour này."
        }
        open={pendingDelete !== null}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete?.kind === "schedule") {
            deleteScheduleMutation.mutate(pendingDelete.schedule);
          }

          if (pendingDelete?.kind === "itinerary") {
            deleteItineraryMutation.mutate(pendingDelete.item);
          }
        }}
        title={pendingDelete?.kind === "itinerary" ? "Xóa mục lịch trình?" : "Xóa lịch khởi hành?"}
      />
    </div>
  );
}
