"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FiArchive, FiEdit2, FiGrid, FiImage, FiMap, FiPlus, FiRefreshCw, FiSave, FiTrash2 } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectField } from "@/components/ui/select-field";
import { SwitchField } from "@/components/ui/switch-field";
import { useToast } from "@/components/ui/toast";
import {
  archiveInternalTour,
  createInternalTour,
  deleteInternalTourMedia,
  getInternalDestinations,
  getInternalTour,
  getInternalTourMedia,
  getInternalTourPage,
  getInternalVehicleCatalog,
  hardDeleteInternalTour,
  restoreInternalTour,
  setInternalTourMediaCover,
  updateInternalTour,
  uploadInternalTourMedia,
  type ApiError,
} from "@/lib/client/api-client";
import { tourMutationSchema, type InternalDestination, type InternalTour, type InternalTourMedia, type InternalVehicleCatalogItem, type TourMutationRequest } from "@/lib/shared/internal";

import { InlineSelect, ListFilters, MediaPanel, Thumb, WorkspacePagination, WorkspaceTabs, type MediaItem } from "./catalog-workspace-ui";
import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

type TourTab = "archived" | "list" | "manage" | "media";
type DangerAction =
  | { kind: "archive"; tour: InternalTour }
  | { kind: "delete-media"; media: InternalTourMedia }
  | { kind: "hard-delete"; tour: InternalTour }
  | { kind: "restore"; tour: InternalTour }
  | null;

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

const statusOptions = [
  { label: "draft", value: "draft" },
  { label: "published", value: "published" },
];
const archivedStatusOptions = [{ label: "archived", value: "archived" }];
const tabs = [
  { href: "/internal/tours/manage", icon: FiMap, label: "Tạo + Sửa" },
  { href: "/internal/tours/list", icon: FiGrid, label: "Danh sách" },
  { href: "/internal/tours/archived", icon: FiArchive, label: "Archived" },
  { href: "/internal/tours/media", icon: FiImage, label: "Kho ảnh" },
];

function getActiveTab(pathname: string): TourTab {
  if (pathname.startsWith("/internal/tours/list")) return "list";
  if (pathname.startsWith("/internal/tours/archived")) return "archived";
  if (pathname.startsWith("/internal/tours/media")) return "media";
  return "manage";
}

function pageCopy(tab: TourTab) {
  if (tab === "list") return { title: "Danh sách tour", description: "Tìm kiếm, phân trang, sửa nhanh, soft delete và hard delete tour." };
  if (tab === "archived") return { title: "Tour archived", description: "Khôi phục hoặc xóa vĩnh viễn các tour đã lưu trữ." };
  if (tab === "media") return { title: "Kho ảnh tour", description: "Upload, set cover và quản lý gallery ảnh của từng tour." };
  return { title: "Tạo và chỉnh sửa tour", description: "Quản lý thông tin tour, lookup destination, phương tiện, giá và ảnh đại diện." };
}

function splitLines(value: string) {
  return value.split("\n").map((entry) => entry.trim()).filter(Boolean);
}

function buildForm(tour: InternalTour): TourMutationRequest {
  return {
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
    status: tour.status === "archived" ? "draft" : tour.status,
    summary: tour.summary,
    title: tour.title,
    tourType: tour.tourType,
    vipOnly: tour.vipOnly,
    vehicleCapacity: tour.vehicleCapacity,
    vehicleCatalogId: tour.vehicleCatalogId,
    vehicleCatalogLabel: tour.vehicleCatalogLabel,
    vehicleModel: tour.vehicleModel,
    vehicleType: tour.vehicleType,
  };
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "tour";
}

function buildEditHref(tour: InternalTour) {
  return `/internal/tours/manage/edit/${slugify(tour.title)}-${tour.tourId}`;
}

function extractTourId(pathname: string) {
  return pathname.match(/\/internal\/tours\/manage\/edit\/.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1] ?? null;
}

function isDetailRoute(pathname: string) {
  return /^\/internal\/tours\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathname);
}

export function TourManager() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = getActiveTab(pathname);
  const copy = pageCopy(activeTab);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const loadedEditIdRef = useRef<string | null>(null);
  const editId = extractTourId(pathname);

  const [editing, setEditing] = useState<InternalTour | null>(null);
  const [mediaTarget, setMediaTarget] = useState<InternalTour | null>(null);
  const [form, setForm] = useState<TourMutationRequest>(initialForm);
  const [includedText, setIncludedText] = useState("");
  const [excludedText, setExcludedText] = useState("");
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof TourMutationRequest, string>>>({});
  const [dangerAction, setDangerAction] = useState<DangerAction>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("published");
  const [searchQuery, setSearchQuery] = useState("");
  const [archivedSearchQuery, setArchivedSearchQuery] = useState("");
  const [mediaSearchQuery, setMediaSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(8);
  const [archivedPageSize, setArchivedPageSize] = useState(8);
  const [mediaPageSize, setMediaPageSize] = useState(6);
  const [page, setPage] = useState(1);
  const [archivedPage, setArchivedPage] = useState(1);
  const [mediaPage, setMediaPage] = useState(1);
  const [cursors, setCursors] = useState<Record<number, string | null>>({ 1: null });
  const [archivedCursors, setArchivedCursors] = useState<Record<number, string | null>>({ 1: null });
  const [mediaCursors, setMediaCursors] = useState<Record<number, string | null>>({ 1: null });
  const [isPaging, setIsPaging] = useState(false);

  const destinationsQuery = useQuery({ queryKey: ["internal", "destination-options"] as const, queryFn: () => getInternalDestinations() });
  const vehicleCatalogQuery = useQuery({ queryKey: ["internal", "vehicle-catalog-options"] as const, queryFn: () => getInternalVehicleCatalog() });
  const destinations = destinationsQuery.data?.destinations ?? [];
  const vehicleCatalog = vehicleCatalogQuery.data?.catalog ?? [];
  const destinationOptions = destinations.map((destination: InternalDestination) => ({ label: `${destination.name} - ${destination.city}`, value: destination.destinationId }));
  const vehicleCatalogOptions = vehicleCatalog.map((item: InternalVehicleCatalogItem) => ({ label: item.label, value: item.vehicleCatalogId }));

  useEffect(() => {
    if (!editId || loadedEditIdRef.current === editId) return;
    loadedEditIdRef.current = editId;
    void getInternalTour(editId)
      .then((response) => {
        setEditing(response.tour);
        setMediaTarget(response.tour);
        setForm(buildForm(response.tour));
        setIncludedText(response.tour.includedServices.join("\n"));
        setExcludedText(response.tour.excludedServices.join("\n"));
        setFormErrors({});
      })
      .catch(() => {
        loadedEditIdRef.current = null;
        showToast({ title: "Không thể tải tour", message: "URL chỉnh sửa không hợp lệ hoặc dữ liệu đã bị xóa.", variant: "error" });
      });
  }, [editId, showToast]);

  const listQuery = useQuery({
    queryKey: ["internal", "tours", "page", status, searchQuery, pageSize, cursors[page], page] as const,
    queryFn: () => getInternalTourPage({ cursor: cursors[page] ?? null, limit: pageSize, q: searchQuery, status }),
  });
  const archivedQuery = useQuery({
    queryKey: ["internal", "tours", "page", "archived", archivedSearchQuery, archivedPageSize, archivedCursors[archivedPage], archivedPage] as const,
    queryFn: () => getInternalTourPage({ cursor: archivedCursors[archivedPage] ?? null, limit: archivedPageSize, q: archivedSearchQuery, status: "archived" }),
  });
  const mediaListQuery = useQuery({
    queryKey: ["internal", "tours", "page", "media", mediaSearchQuery, mediaPageSize, mediaCursors[mediaPage], mediaPage] as const,
    queryFn: () => getInternalTourPage({ cursor: mediaCursors[mediaPage] ?? null, limit: mediaPageSize, q: mediaSearchQuery, status: "published" }),
  });
  const mediaQuery = useQuery({
    enabled: Boolean((mediaTarget ?? editing)?.tourId),
    queryKey: ["internal", "tour-media", (mediaTarget ?? editing)?.tourId] as const,
    queryFn: () => getInternalTourMedia((mediaTarget ?? editing)?.tourId ?? ""),
  });
  const statsQuery = useQuery({ queryKey: ["internal", "tours", "stats"] as const, queryFn: () => getInternalTourPage({ limit: 200 }) });
  const stats = useMemo(() => {
    const items = statsQuery.data?.tours ?? [];
    return { archived: items.filter((item) => item.status === "archived").length, published: items.filter((item) => item.status === "published").length, total: items.length, withImage: items.filter((item) => item.coverImageUrl).length };
  }, [statsQuery.data?.tours]);

  const saveMutation = useMutation({
    mutationFn: (input: TourMutationRequest) => editing ? updateInternalTour(editing.tourId, input) : createInternalTour(input),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "tours"] });
      setEditing(response.tour);
      setMediaTarget(response.tour);
      setForm(buildForm(response.tour));
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          await uploadInternalTourMedia(response.tour.tourId, { file, isCover: !response.tour.coverImageUrl, mediaType: "image" });
        }
        setSelectedFiles([]);
        await queryClient.invalidateQueries({ queryKey: ["internal", "tour-media", response.tour.tourId] });
      }
      showToast({ message: "Tour đã được lưu.", title: "Lưu thành công", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Không thể lưu", variant: "error" }),
  });
  const archiveMutation = useMutation({ mutationFn: (tour: InternalTour) => archiveInternalTour(tour.tourId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["internal", "tours"] }); showToast({ message: "Tour đã chuyển sang archived.", title: "Đã lưu trữ", variant: "success" }); } });
  const hardDeleteMutation = useMutation({ mutationFn: (tour: InternalTour) => hardDeleteInternalTour(tour.tourId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["internal", "tours"] }); resetForm(); showToast({ message: "Tour đã bị xóa vĩnh viễn.", title: "Đã xóa", variant: "success" }); } });
  const restoreMutation = useMutation({ mutationFn: (tour: InternalTour) => restoreInternalTour(tour.tourId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["internal", "tours"] }); showToast({ message: "Tour đã được khôi phục.", title: "Đã khôi phục", variant: "success" }); } });
  const uploadMutation = useMutation({
    mutationFn: async () => {
      const target = mediaTarget ?? editing;
      for (const file of selectedFiles) {
        await uploadInternalTourMedia(target?.tourId ?? "", { file, isCover: (mediaQuery.data?.media ?? []).length === 0, mediaType: "image" });
      }
    },
    onSuccess: async () => { setSelectedFiles([]); await queryClient.invalidateQueries({ queryKey: ["internal", "tour-media"] }); await queryClient.invalidateQueries({ queryKey: ["internal", "tours"] }); },
  });
  const deleteMediaMutation = useMutation({ mutationFn: (media: InternalTourMedia) => deleteInternalTourMedia((mediaTarget ?? editing)?.tourId ?? "", media.mediaId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["internal", "tour-media"] }); await queryClient.invalidateQueries({ queryKey: ["internal", "tours"] }); } });
  const setCoverMutation = useMutation({ mutationFn: (media: InternalTourMedia) => setInternalTourMediaCover((mediaTarget ?? editing)?.tourId ?? "", media.mediaId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["internal", "tour-media"] }); await queryClient.invalidateQueries({ queryKey: ["internal", "tours"] }); } });

  if (isDetailRoute(pathname)) {
    return null;
  }

  function resetForm() {
    setEditing(null);
    setMediaTarget(null);
    setForm(initialForm);
    setIncludedText("");
    setExcludedText("");
    setFormErrors({});
    setSelectedFiles([]);
  }

  function resetListPage() { setPage(1); setCursors({ 1: null }); }
  function resetArchivedPage() { setArchivedPage(1); setArchivedCursors({ 1: null }); }
  function resetMediaPage() { setMediaPage(1); setMediaCursors({ 1: null }); }

  function startEdit(tour: InternalTour, preserveUrl = false) {
    setEditing(tour);
    setMediaTarget(tour);
    setForm(buildForm(tour));
    setIncludedText(tour.includedServices.join("\n"));
    setExcludedText(tour.excludedServices.join("\n"));
    setFormErrors({});
    if (!preserveUrl) router.push(buildEditHref(tour));
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = tourMutationSchema.safeParse({ ...form, excludedServices: splitLines(excludedText), includedServices: splitLines(includedText) });
    if (!parsed.success) {
      setFormErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as Partial<Record<keyof TourMutationRequest, string>>);
      return;
    }
    saveMutation.mutate(parsed.data);
  };

  const jumpToPage = async (targetPage: number, context: { limit: number; q: string; setCursors: (value: Record<number, string | null>) => void; setPage: (value: number) => void; status: string }) => {
    if (targetPage < 1) return;
    setIsPaging(true);
    try {
      const nextCursors: Record<number, string | null> = { 1: null };
      let cursor: string | null = null;
      for (let index = 1; index < targetPage; index += 1) {
        const response = await getInternalTourPage({ cursor, limit: context.limit, q: context.q, status: context.status });
        if (!response.nextCursor) {
          showToast({ title: "Không có trang này", message: `Chỉ tìm thấy đến trang ${index}.`, variant: "error" });
          context.setCursors(nextCursors);
          context.setPage(index);
          return;
        }
        cursor = response.nextCursor;
        nextCursors[index + 1] = cursor;
      }
      context.setCursors(nextCursors);
      context.setPage(targetPage);
    } finally {
      setIsPaging(false);
    }
  };

  const confirmDangerAction = () => {
    if (dangerAction?.kind === "archive") archiveMutation.mutate(dangerAction.tour);
    if (dangerAction?.kind === "hard-delete") hardDeleteMutation.mutate(dangerAction.tour);
    if (dangerAction?.kind === "restore") restoreMutation.mutate(dangerAction.tour);
    if (dangerAction?.kind === "delete-media") deleteMediaMutation.mutate(dangerAction.media);
    setDangerAction(null);
  };

  const list = listQuery.data?.tours ?? [];
  const archived = archivedQuery.data?.tours ?? [];
  const mediaList = mediaListQuery.data?.tours ?? [];
  const activeMediaTarget = mediaTarget ?? editing;
  const media = (mediaQuery.data?.media ?? []).map((item) => ({ ...item, isCover: item.mediaUrl === activeMediaTarget?.coverImageUrl }));

  return (
    <div className="space-y-5">
      <InternalPageHeader action={<button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white" onClick={() => { resetForm(); router.push(activeTab === "manage" ? "/internal/tours/list" : "/internal/tours/manage"); }} type="button">{activeTab === "manage" ? <FiGrid size={17} /> : <FiPlus size={17} />}{activeTab === "manage" ? "Danh sách" : "Tour mới"}</button>} description={copy.description} title={copy.title} />
      <WorkspaceTabs pathname={pathname} tabs={tabs} />
      <div className="grid gap-3 md:grid-cols-4">{[["Tổng", stats.total], ["Published", stats.published], ["Có ảnh", stats.withImage], ["Archived", stats.archived]].map(([label, value]) => <InternalPanel className="p-4" key={label}><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></InternalPanel>)}</div>

      {activeTab === "manage" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
          <InternalPanel className="p-4">
            <h3 className="text-base font-semibold">{editing ? "Cập nhật tour" : "Tạo tour"}</h3>
            <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField className="md:col-span-2" error={formErrors.destinationId} label="Chọn địa điểm" name="tour-destination" onValueChange={(value) => { const selected = destinations.find((destination) => destination.destinationId === value); if (selected) setForm((current) => ({ ...current, destinationId: selected.destinationId, destinationName: selected.name })); }} options={destinationOptions} placeholder="Chọn địa điểm" value={form.destinationId} />
                <SelectField className="md:col-span-2" error={formErrors.vehicleCatalogId} label="Chọn phương tiện" name="tour-vehicle-catalog" onValueChange={(value) => { const selected = vehicleCatalog.find((item) => item.vehicleCatalogId === value); if (selected) setForm((current) => ({ ...current, vehicleCapacity: selected.vehicleCapacity, vehicleCatalogId: selected.vehicleCatalogId, vehicleCatalogLabel: selected.label, vehicleModel: selected.vehicleModel, vehicleType: selected.vehicleType })); }} options={vehicleCatalogOptions} placeholder="Chọn phương tiện" value={form.vehicleCatalogId} />
                <TextInput error={formErrors.title} label="Tên tour" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
                <TextInput error={formErrors.slug} label="Slug" value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: value }))} />
                <TextInput error={formErrors.destinationName} label="Điểm đến" value={form.destinationName} onChange={(value) => setForm((current) => ({ ...current, destinationName: value }))} />
                <TextInput error={formErrors.category} label="Danh mục" value={form.category} onChange={(value) => setForm((current) => ({ ...current, category: value }))} />
                <TextInput error={formErrors.tourType} label="Loại tour" value={form.tourType} onChange={(value) => setForm((current) => ({ ...current, tourType: value }))} />
                <SelectField error={formErrors.status} label="Trạng thái" name="tour-status" onValueChange={(value) => setForm((current) => ({ ...current, status: value as TourMutationRequest["status"] }))} options={statusOptions} placeholder="Chọn trạng thái" value={form.status} />
                <TextInput error={formErrors.vehicleType} label="Loại phương tiện" value={form.vehicleType} onChange={(value) => setForm((current) => ({ ...current, vehicleType: value }))} />
                <TextInput error={formErrors.vehicleModel} label="Dòng xe" value={form.vehicleModel} onChange={(value) => setForm((current) => ({ ...current, vehicleModel: value }))} />
                <TextInput error={formErrors.vehicleCatalogLabel} label="Tên phương tiện" value={form.vehicleCatalogLabel} onChange={(value) => setForm((current) => ({ ...current, vehicleCatalogLabel: value }))} />
                <TextInput error={formErrors.vehicleCapacity} label="Số chỗ" type="number" value={String(form.vehicleCapacity)} onChange={(value) => setForm((current) => ({ ...current, vehicleCapacity: Number(value) }))} />
                <TextInput error={formErrors.basePrice} label="Giá cơ bản" value={form.basePrice} onChange={(value) => setForm((current) => ({ ...current, basePrice: value }))} />
                <TextInput error={formErrors.currency} label="Tiền tệ" value={form.currency} onChange={(value) => setForm((current) => ({ ...current, currency: value.toUpperCase() }))} />
                <TextInput error={formErrors.durationDays} label="Số ngày" type="number" value={String(form.durationDays)} onChange={(value) => setForm((current) => ({ ...current, durationDays: Number(value) }))} />
                <TextInput error={formErrors.durationNights} label="Số đêm" type="number" value={String(form.durationNights)} onChange={(value) => setForm((current) => ({ ...current, durationNights: Number(value) }))} />
                <TextInput error={formErrors.minGuests} label="Khách tối thiểu" type="number" value={String(form.minGuests)} onChange={(value) => setForm((current) => ({ ...current, minGuests: Number(value) }))} />
                <TextInput error={formErrors.maxGuests} label="Khách tối đa" type="number" value={String(form.maxGuests)} onChange={(value) => setForm((current) => ({ ...current, maxGuests: Number(value) }))} />
              </div>
              <SwitchField checked={form.vipOnly} label="Chỉ dành cho VIP" name="tour-vip-only" onCheckedChange={(checked) => setForm((current) => ({ ...current, vipOnly: checked }))} />
              <label className="space-y-2"><span className="text-sm font-semibold">Tóm tắt</span><textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={form.summary ?? ""} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} /></label>
              <div className="grid gap-4 md:grid-cols-2"><Textarea label="Dịch vụ bao gồm" value={includedText} onChange={setIncludedText} /><Textarea label="Dịch vụ không bao gồm" value={excludedText} onChange={setExcludedText} /></div>
              <div className="flex flex-wrap gap-3"><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-70" disabled={saveMutation.isPending} type="submit"><FiSave size={17} />{selectedFiles.length > 0 ? `Lưu và upload ${selectedFiles.length} ảnh` : "Lưu tour"}</button><button className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold dark:border-neutral-800" onClick={resetForm} type="button">Làm mới</button></div>
            </form>
          </InternalPanel>
          <MediaPanel disabled={!editing || saveMutation.isPending} emptyLabel={editing ? "Chưa có ảnh trong gallery." : "Lưu tour trước khi upload ảnh."} media={media as MediaItem[]} mediaPending={mediaQuery.isLoading} onDeleteMedia={(item) => setDangerAction({ kind: "delete-media", media: item as InternalTourMedia })} onSelectFiles={setSelectedFiles} onSetCover={(item) => setCoverMutation.mutate(item as InternalTourMedia)} onUpload={() => uploadMutation.mutate()} selectedFiles={selectedFiles} targetLabel={editing ? `Ảnh của ${editing.title}` : "Ảnh tour"} uploadPending={uploadMutation.isPending} />
        </div>
      ) : null}

      {activeTab === "list" ? <TourListPanel empty={listQuery.isLoading || isPaging ? "Đang tải tour..." : "Không tìm thấy tour phù hợp."} hardPending={hardDeleteMutation.isPending} items={list} pageProps={{ currentPage: page, hasNextPage: Boolean(listQuery.data?.nextCursor), hasPreviousPage: page > 1, isPaging: isPaging || listQuery.isFetching, itemLabel: "tour", onJumpToPage: (next) => jumpToPage(next, { limit: pageSize, q: searchQuery, setCursors, setPage, status }), onNextPage: () => { if (listQuery.data?.nextCursor) { setCursors((current) => ({ ...current, [page + 1]: listQuery.data?.nextCursor ?? null })); setPage((current) => current + 1); } }, onPreviousPage: () => setPage((current) => Math.max(1, current - 1)), pageSize, visible: list.length > 0 }} searchProps={{ pageSize, searchQuery, setPageSize: (value) => { setPageSize(value); resetListPage(); }, setSearchQuery: (value) => { setSearchQuery(value); resetListPage(); } }} status={status} setStatus={(value) => { setStatus(value); resetListPage(); }} onArchive={(tour) => setDangerAction({ kind: "archive", tour })} onEdit={(tour) => startEdit(tour)} onHardDelete={(tour) => setDangerAction({ kind: "hard-delete", tour })} onMedia={(tour) => { setMediaTarget(tour); router.push("/internal/tours/media"); }} /> : null}

      {activeTab === "archived" ? <TourListPanel archived empty={archivedQuery.isLoading || isPaging ? "Đang tải archived..." : "Không có tour archived."} hardPending={hardDeleteMutation.isPending} items={archived} pageProps={{ currentPage: archivedPage, hasNextPage: Boolean(archivedQuery.data?.nextCursor), hasPreviousPage: archivedPage > 1, isPaging: isPaging || archivedQuery.isFetching, itemLabel: "tour archived", onJumpToPage: (next) => jumpToPage(next, { limit: archivedPageSize, q: archivedSearchQuery, setCursors: setArchivedCursors, setPage: setArchivedPage, status: "archived" }), onNextPage: () => { if (archivedQuery.data?.nextCursor) { setArchivedCursors((current) => ({ ...current, [archivedPage + 1]: archivedQuery.data?.nextCursor ?? null })); setArchivedPage((current) => current + 1); } }, onPreviousPage: () => setArchivedPage((current) => Math.max(1, current - 1)), pageSize: archivedPageSize, visible: archived.length > 0 }} searchProps={{ pageSize: archivedPageSize, searchQuery: archivedSearchQuery, setPageSize: (value) => { setArchivedPageSize(value); resetArchivedPage(); }, setSearchQuery: (value) => { setArchivedSearchQuery(value); resetArchivedPage(); } }} status="archived" setStatus={() => undefined} onHardDelete={(tour) => setDangerAction({ kind: "hard-delete", tour })} onRestore={(tour) => setDangerAction({ kind: "restore", tour })} /> : null}

      {activeTab === "media" ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <TourListPanel compact empty={mediaListQuery.isLoading || isPaging ? "Đang tải tour..." : "Không có tour để quản lý ảnh."} hardPending={hardDeleteMutation.isPending} items={mediaList} pageProps={{ currentPage: mediaPage, hasNextPage: Boolean(mediaListQuery.data?.nextCursor), hasPreviousPage: mediaPage > 1, isPaging: isPaging || mediaListQuery.isFetching, itemLabel: "tour", onJumpToPage: (next) => jumpToPage(next, { limit: mediaPageSize, q: mediaSearchQuery, setCursors: setMediaCursors, setPage: setMediaPage, status: "published" }), onNextPage: () => { if (mediaListQuery.data?.nextCursor) { setMediaCursors((current) => ({ ...current, [mediaPage + 1]: mediaListQuery.data?.nextCursor ?? null })); setMediaPage((current) => current + 1); } }, onPreviousPage: () => setMediaPage((current) => Math.max(1, current - 1)), pageSize: mediaPageSize, visible: mediaList.length > 0 }} searchProps={{ pageSize: mediaPageSize, searchQuery: mediaSearchQuery, setPageSize: (value) => { setMediaPageSize(value); resetMediaPage(); }, setSearchQuery: (value) => { setMediaSearchQuery(value); resetMediaPage(); } }} status="published" setStatus={() => undefined} onMedia={setMediaTarget} selectedTourId={activeMediaTarget?.tourId} />
          <MediaPanel disabled={!activeMediaTarget || uploadMutation.isPending} emptyLabel="Chưa có ảnh trong gallery." media={media as MediaItem[]} mediaPending={mediaQuery.isLoading} onDeleteMedia={(item) => setDangerAction({ kind: "delete-media", media: item as InternalTourMedia })} onSelectFiles={setSelectedFiles} onSetCover={(item) => setCoverMutation.mutate(item as InternalTourMedia)} onUpload={() => uploadMutation.mutate()} selectedFiles={selectedFiles} targetLabel={activeMediaTarget ? `Ảnh của ${activeMediaTarget.title}` : "Chọn tour để quản lý ảnh"} uploadPending={uploadMutation.isPending} />
        </div>
      ) : null}

      <ConfirmModal confirmLabel={dangerAction?.kind === "restore" ? "Khôi phục" : dangerAction?.kind === "hard-delete" ? "Xóa vĩnh viễn" : dangerAction?.kind === "delete-media" ? "Xóa ảnh" : "Lưu trữ"} description={dangerAction?.kind === "hard-delete" ? "Tour và toàn bộ ảnh sẽ bị xóa vĩnh viễn." : dangerAction?.kind === "restore" ? "Tour sẽ quay lại trạng thái trước khi archived." : dangerAction?.kind === "delete-media" ? "Ảnh sẽ bị xóa khỏi gallery." : "Tour sẽ chuyển sang archived."} open={dangerAction !== null} onCancel={() => setDangerAction(null)} onConfirm={confirmDangerAction} title={dangerAction?.kind === "hard-delete" ? "Xóa vĩnh viễn?" : dangerAction?.kind === "restore" ? "Khôi phục?" : dangerAction?.kind === "delete-media" ? "Xóa ảnh?" : "Lưu trữ?"} />
    </div>
  );
}

function TextInput({ error, label, onChange, type = "text", value }: { error?: string; label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return <label className="space-y-2"><span className="text-sm font-semibold">{label}</span><input className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none dark:bg-black ${error ? "border-rose-300" : "border-slate-200 dark:border-neutral-800"}`} type={type} value={value} onChange={(event) => onChange(event.target.value)} />{error ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{error}</p> : null}</label>;
}

function Textarea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return <label className="space-y-2"><span className="text-sm font-semibold">{label}</span><textarea className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TourListPanel({ archived = false, compact = false, empty, hardPending, items, onArchive, onEdit, onHardDelete, onMedia, onRestore, pageProps, searchProps, selectedTourId, setStatus, status }: { archived?: boolean; compact?: boolean; empty: string; hardPending: boolean; items: InternalTour[]; onArchive?: (tour: InternalTour) => void; onEdit?: (tour: InternalTour) => void; onHardDelete?: (tour: InternalTour) => void; onMedia?: (tour: InternalTour) => void; onRestore?: (tour: InternalTour) => void; pageProps: React.ComponentProps<typeof WorkspacePagination>; searchProps: React.ComponentProps<typeof ListFilters>; selectedTourId?: string; setStatus: (value: string) => void; status: string }) {
  return (
    <InternalPanel className="p-4">
      <ListFilters {...searchProps}>
        {archived ? <InlineSelect label="Trạng thái" name="tour-filter-archived" onChange={() => undefined} options={archivedStatusOptions} value="archived" /> : <InlineSelect label="Trạng thái" name="tour-filter-status" onChange={setStatus} options={statusOptions} value={status} />}
      </ListFilters>
      {items.length === 0 ? <div className="mt-4"><EmptyState message={empty} /></div> : <div className="mt-4 grid gap-4 xl:grid-cols-2">{items.map((tour) => <TourCard archived={archived} compact={compact} hardPending={hardPending} key={tour.tourId} onArchive={onArchive} onEdit={onEdit} onHardDelete={onHardDelete} onMedia={onMedia} onRestore={onRestore} selected={selectedTourId === tour.tourId} tour={tour} />)}</div>}
      <WorkspacePagination {...pageProps} />
    </InternalPanel>
  );
}

function TourCard({ archived, compact, hardPending, onArchive, onEdit, onHardDelete, onMedia, onRestore, selected, tour }: { archived?: boolean; compact?: boolean; hardPending: boolean; onArchive?: (tour: InternalTour) => void; onEdit?: (tour: InternalTour) => void; onHardDelete?: (tour: InternalTour) => void; onMedia?: (tour: InternalTour) => void; onRestore?: (tour: InternalTour) => void; selected?: boolean; tour: InternalTour }) {
  return (
    <article className={`rounded-2xl border bg-white p-3 dark:bg-black ${selected ? "border-sky-300 dark:border-sky-900" : "border-slate-200 dark:border-neutral-800"}`}>
      <div className="flex gap-3">
        <Thumb alt={tour.title} thumbnailUrl={tour.coverImageUrl} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link className="truncate text-sm font-semibold hover:text-sky-700" href={`/internal/tours/${tour.tourId}`}>{tour.title}</Link><p className="mt-1 text-xs text-slate-500">{tour.destinationName} - {Number(tour.basePrice).toLocaleString("vi-VN")} {tour.currency}</p></div><StatusPill value={tour.status} /></div>
          {!compact ? <p className="line-clamp-2 text-sm text-slate-600 dark:text-neutral-400">{tour.summary || "Không có tóm tắt."}</p> : null}
          <div className="flex flex-wrap gap-2">
            {archived ? <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700" onClick={() => onRestore?.(tour)} type="button"><FiRefreshCw size={14} />Restore</button> : <>
              {!compact ? <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-neutral-800" onClick={() => onEdit?.(tour)} type="button"><FiEdit2 size={14} />Sửa</button> : null}
              <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-neutral-800" onClick={() => onMedia?.(tour)} type="button"><FiImage size={14} />Ảnh</button>
              {!compact ? <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700" onClick={() => onArchive?.(tour)} type="button"><FiTrash2 size={14} />Soft delete</button> : null}
            </>}
            {!compact ? <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 disabled:opacity-70" disabled={hardPending} onClick={() => onHardDelete?.(tour)} type="button"><FiTrash2 size={14} />Hard delete</button> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
