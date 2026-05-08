"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FiArchive, FiEdit2, FiGrid, FiImage, FiLayers, FiPlus, FiRefreshCw, FiSave, FiTrash2 } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  createInternalService,
  deleteInternalService,
  deleteInternalServiceMedia,
  getInternalDestinations,
  getInternalService,
  getInternalServiceMedia,
  getInternalServicePage,
  getInternalServiceProviders,
  hardDeleteInternalService,
  restoreInternalService,
  setInternalServiceMediaCover,
  updateInternalService,
  uploadInternalServiceMedia,
  type ApiError,
} from "@/lib/client/api-client";
import { serviceCatalogMutationSchema, type InternalDestination, type InternalServiceCatalog, type InternalServiceMedia, type ServiceCatalogMutationRequest } from "@/lib/shared/internal";

import { InlineSelect, ListFilters, MediaPanel, Thumb, WorkspacePagination, WorkspaceTabs, type MediaItem } from "./catalog-workspace-ui";
import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

type ServiceTab = "archived" | "list" | "manage" | "media";
type DangerAction =
  | { kind: "archive"; service: InternalServiceCatalog }
  | { kind: "delete-media"; media: InternalServiceMedia }
  | { kind: "hard-delete"; service: InternalServiceCatalog }
  | { kind: "restore"; service: InternalServiceCatalog }
  | null;

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

const statusOptions = [
  { label: "draft", value: "draft" },
  { label: "published", value: "published" },
];
const serviceTypeOptions = [
  { label: "transport", value: "transport" },
  { label: "hotel", value: "hotel" },
  { label: "restaurant", value: "restaurant" },
  { label: "guide", value: "guide" },
  { label: "ticket", value: "ticket" },
];
const archivedStatusOptions = [{ label: "archived", value: "archived" }];
const tabs = [
  { href: "/internal/services/manage", icon: FiLayers, label: "Tạo + Sửa" },
  { href: "/internal/services/list", icon: FiGrid, label: "Danh sách" },
  { href: "/internal/services/archived", icon: FiArchive, label: "Archived" },
  { href: "/internal/services/media", icon: FiImage, label: "Kho ảnh" },
];

function getActiveTab(pathname: string): ServiceTab {
  if (pathname.startsWith("/internal/services/list")) return "list";
  if (pathname.startsWith("/internal/services/archived")) return "archived";
  if (pathname.startsWith("/internal/services/media")) return "media";
  return "manage";
}

function pageCopy(tab: ServiceTab) {
  if (tab === "list") return { title: "Danh sách dịch vụ", description: "Duyệt dịch vụ theo điểm đến, tìm kiếm, phân trang, soft delete và hard delete." };
  if (tab === "archived") return { title: "Dịch vụ archived", description: "Khôi phục hoặc xóa vĩnh viễn dịch vụ đã lưu trữ." };
  if (tab === "media") return { title: "Kho ảnh dịch vụ", description: "Upload, set cover và quản lý gallery của từng dịch vụ." };
  return { title: "Tạo và chỉnh sửa dịch vụ", description: "Quản lý dịch vụ theo destination, provider, trạng thái, giá và ảnh đại diện." };
}

function buildForm(service: InternalServiceCatalog): ServiceCatalogMutationRequest {
  return {
    basePrice: service.basePrice,
    currency: service.currency,
    destinationId: service.destinationId,
    description: service.description ?? "",
    name: service.name,
    providerId: service.providerId,
    serviceType: service.serviceType,
    status: service.status === "archived" ? service.archivedFromStatus ?? "draft" : service.status,
  };
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "service";
}

function buildEditHref(service: InternalServiceCatalog) {
  return `/internal/services/manage/edit/${service.destinationId}/${service.serviceType}/${slugify(service.name)}-${service.serviceId}`;
}

function extractEditService(pathname: string) {
  const match = pathname.match(/\/internal\/services\/manage\/edit\/([^/]+)\/([^/]+)\/.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return match ? { destinationId: decodeURIComponent(match[1]), serviceType: decodeURIComponent(match[2]), serviceId: match[3] } : null;
}

export function ServiceManager() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = getActiveTab(pathname);
  const copy = pageCopy(activeTab);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const loadedEditRef = useRef<string | null>(null);
  const editService = extractEditService(pathname);

  const [destinationId, setDestinationId] = useState("");
  const [editing, setEditing] = useState<InternalServiceCatalog | null>(null);
  const [mediaTarget, setMediaTarget] = useState<InternalServiceCatalog | null>(null);
  const [form, setForm] = useState<ServiceCatalogMutationRequest>(initialForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ServiceCatalogMutationRequest, string>>>({});
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
  const providersQuery = useQuery({
    enabled: Boolean(form.serviceType),
    queryKey: ["internal", "service-providers", form.serviceType] as const,
    queryFn: () => getInternalServiceProviders(form.serviceType),
  });
  const destinations = destinationsQuery.data?.destinations ?? [];
  const destinationOptions = destinations.map((destination: InternalDestination) => ({ label: `${destination.name} - ${destination.city}`, value: destination.destinationId }));
  const providerOptions = providersQuery.data?.providers.map((provider) => ({ label: `${provider.providerName} - ${provider.region}`, value: provider.providerId })) ?? [];

  useEffect(() => {
    if (!editService || loadedEditRef.current === editService.serviceId) return;
    loadedEditRef.current = editService.serviceId;
    void getInternalService(editService.destinationId, editService.serviceType, editService.serviceId)
      .then((response) => {
        setDestinationId(response.service.destinationId);
        setEditing(response.service);
        setMediaTarget(response.service);
        setForm(buildForm(response.service));
        setFormErrors({});
      })
      .catch(() => {
        loadedEditRef.current = null;
        showToast({ title: "Không thể tải dịch vụ", message: "URL chỉnh sửa không hợp lệ hoặc dữ liệu đã bị xóa.", variant: "error" });
      });
  }, [editService, showToast]);

  const listQuery = useQuery({
    enabled: Boolean(destinationId),
    queryKey: ["internal", "services", "page", destinationId, status, searchQuery, pageSize, cursors[page], page] as const,
    queryFn: () => getInternalServicePage({ cursor: cursors[page] ?? null, destinationId, limit: pageSize, q: searchQuery, status }),
  });
  const archivedQuery = useQuery({
    enabled: Boolean(destinationId),
    queryKey: ["internal", "services", "page", destinationId, "archived", archivedSearchQuery, archivedPageSize, archivedCursors[archivedPage], archivedPage] as const,
    queryFn: () => getInternalServicePage({ cursor: archivedCursors[archivedPage] ?? null, destinationId, limit: archivedPageSize, q: archivedSearchQuery, status: "archived" }),
  });
  const mediaListQuery = useQuery({
    enabled: Boolean(destinationId),
    queryKey: ["internal", "services", "page", destinationId, "media", mediaSearchQuery, mediaPageSize, mediaCursors[mediaPage], mediaPage] as const,
    queryFn: () => getInternalServicePage({ cursor: mediaCursors[mediaPage] ?? null, destinationId, limit: mediaPageSize, q: mediaSearchQuery, status: "published" }),
  });
  const mediaQuery = useQuery({
    enabled: Boolean((mediaTarget ?? editing)?.serviceId),
    queryKey: ["internal", "service-media", (mediaTarget ?? editing)?.destinationId, (mediaTarget ?? editing)?.serviceType, (mediaTarget ?? editing)?.serviceId] as const,
    queryFn: () => {
      const target = mediaTarget ?? editing;
      return getInternalServiceMedia(target?.destinationId ?? "", target?.serviceType ?? "", target?.serviceId ?? "");
    },
  });
  const statsQuery = useQuery({
    enabled: Boolean(destinationId),
    queryKey: ["internal", "services", "stats", destinationId] as const,
    queryFn: () => getInternalServicePage({ destinationId, limit: 200, status: "" }),
  });
  const stats = useMemo(() => {
    const items = statsQuery.data?.services ?? [];
    return {
      archived: items.filter((item) => item.status === "archived").length,
      published: items.filter((item) => item.status === "published").length,
      total: items.length,
      withImage: items.filter((item) => item.thumbnailUrl).length,
    };
  }, [statsQuery.data?.services]);

  const saveMutation = useMutation({
    mutationFn: (input: ServiceCatalogMutationRequest) => editing ? updateInternalService(editing.destinationId, editing.serviceType, editing.serviceId, input) : createInternalService(input),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "services"] });
      setDestinationId(response.service.destinationId);
      setEditing(response.service);
      setMediaTarget(response.service);
      setForm(buildForm(response.service));
      if (selectedFiles.length > 0) {
        await uploadInternalServiceMedia(response.service.destinationId, response.service.serviceType, response.service.serviceId, { files: selectedFiles, isCover: !response.service.imageUrl });
        setSelectedFiles([]);
        await queryClient.invalidateQueries({ queryKey: ["internal", "service-media"] });
      }
      showToast({ message: "Dịch vụ đã được lưu.", title: "Lưu thành công", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Không thể lưu", variant: "error" }),
  });
  const archiveMutation = useMutation({ mutationFn: (service: InternalServiceCatalog) => deleteInternalService(service.destinationId, service.serviceType, service.serviceId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["internal", "services"] }); showToast({ message: "Dịch vụ đã chuyển sang archived.", title: "Đã lưu trữ", variant: "success" }); } });
  const hardDeleteMutation = useMutation({ mutationFn: (service: InternalServiceCatalog) => hardDeleteInternalService(service.destinationId, service.serviceType, service.serviceId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["internal", "services"] }); resetForm(); showToast({ message: "Dịch vụ đã bị xóa vĩnh viễn.", title: "Đã xóa", variant: "success" }); } });
  const restoreMutation = useMutation({ mutationFn: (service: InternalServiceCatalog) => restoreInternalService(service.destinationId, service.serviceType, service.serviceId), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["internal", "services"] }); showToast({ message: "Dịch vụ đã được khôi phục.", title: "Đã khôi phục", variant: "success" }); } });
  const uploadMutation = useMutation({
    mutationFn: () => {
      const target = mediaTarget ?? editing;
      return uploadInternalServiceMedia(target?.destinationId ?? "", target?.serviceType ?? "", target?.serviceId ?? "", { files: selectedFiles, isCover: (mediaQuery.data?.media ?? []).length === 0 });
    },
    onSuccess: async () => { setSelectedFiles([]); await queryClient.invalidateQueries({ queryKey: ["internal", "service-media"] }); await queryClient.invalidateQueries({ queryKey: ["internal", "services"] }); },
  });
  const deleteMediaMutation = useMutation({
    mutationFn: (media: InternalServiceMedia) => {
      const target = mediaTarget ?? editing;
      return deleteInternalServiceMedia(target?.destinationId ?? "", target?.serviceType ?? "", target?.serviceId ?? "", media.mediaId);
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["internal", "service-media"] }); await queryClient.invalidateQueries({ queryKey: ["internal", "services"] }); },
  });
  const setCoverMutation = useMutation({
    mutationFn: (media: InternalServiceMedia) => {
      const target = mediaTarget ?? editing;
      return setInternalServiceMediaCover(target?.destinationId ?? "", target?.serviceType ?? "", target?.serviceId ?? "", media.mediaId);
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["internal", "service-media"] }); await queryClient.invalidateQueries({ queryKey: ["internal", "services"] }); },
  });

  function resetForm() {
    setEditing(null);
    setMediaTarget(null);
    setForm({ ...initialForm, destinationId });
    setFormErrors({});
    setSelectedFiles([]);
  }

  function resetListPage() { setPage(1); setCursors({ 1: null }); }
  function resetArchivedPage() { setArchivedPage(1); setArchivedCursors({ 1: null }); }
  function resetMediaPage() { setMediaPage(1); setMediaCursors({ 1: null }); }

  function startEdit(service: InternalServiceCatalog, preserveUrl = false) {
    setDestinationId(service.destinationId);
    setEditing(service);
    setMediaTarget(service);
    setForm(buildForm(service));
    setFormErrors({});
    if (!preserveUrl) router.push(buildEditHref(service));
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = serviceCatalogMutationSchema.safeParse({ ...form, destinationId: destinationId || form.destinationId });
    if (!parsed.success) {
      setFormErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as Partial<Record<keyof ServiceCatalogMutationRequest, string>>);
      return;
    }
    saveMutation.mutate(parsed.data);
  };

  const jumpToPage = async (
    targetPage: number,
    context: { limit: number; q: string; setCursors: (value: Record<number, string | null>) => void; setPage: (value: number) => void; status: string },
  ) => {
    if (targetPage < 1 || !destinationId) return;
    setIsPaging(true);
    try {
      const nextCursors: Record<number, string | null> = { 1: null };
      let cursor: string | null = null;
      for (let index = 1; index < targetPage; index += 1) {
        const response = await getInternalServicePage({ cursor, destinationId, limit: context.limit, q: context.q, status: context.status });
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
    if (dangerAction?.kind === "archive") archiveMutation.mutate(dangerAction.service);
    if (dangerAction?.kind === "hard-delete") hardDeleteMutation.mutate(dangerAction.service);
    if (dangerAction?.kind === "restore") restoreMutation.mutate(dangerAction.service);
    if (dangerAction?.kind === "delete-media") deleteMediaMutation.mutate(dangerAction.media);
    setDangerAction(null);
  };

  const list = listQuery.data?.services ?? [];
  const archived = archivedQuery.data?.services ?? [];
  const mediaList = mediaListQuery.data?.services ?? [];
  const activeMediaTarget = mediaTarget ?? editing;
  const media = mediaQuery.data?.media ?? [];

  return (
    <div className="space-y-5">
      <InternalPageHeader
        action={<button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white" onClick={() => { resetForm(); router.push(activeTab === "manage" ? "/internal/services/list" : "/internal/services/manage"); }} type="button">{activeTab === "manage" ? <FiGrid size={17} /> : <FiPlus size={17} />}{activeTab === "manage" ? "Danh sách" : "Dịch vụ mới"}</button>}
        description={copy.description}
        title={copy.title}
      />
      <WorkspaceTabs pathname={pathname} tabs={tabs} />
      <div className="grid gap-3 md:grid-cols-4">
        {[["Tổng", stats.total], ["Published", stats.published], ["Có ảnh", stats.withImage], ["Archived", stats.archived]].map(([label, value]) => <InternalPanel className="p-4" key={label}><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></InternalPanel>)}
      </div>

      {activeTab === "manage" ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <InternalPanel className="p-4">
            <h3 className="text-base font-semibold">{editing ? "Cập nhật dịch vụ" : "Tạo dịch vụ"}</h3>
            <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
              <SelectField disabled={Boolean(editing)} error={formErrors.destinationId} label="Chọn địa điểm" name="service-destination" onValueChange={(value) => { setDestinationId(value); setForm((current) => ({ ...current, destinationId: value })); resetListPage(); resetArchivedPage(); resetMediaPage(); }} options={destinationOptions} placeholder="Chọn địa điểm" value={destinationId || form.destinationId} />
              <div className="grid gap-4 md:grid-cols-2">
                <SelectField disabled={Boolean(editing)} error={formErrors.serviceType} label="Loại dịch vụ" name="service-type" onValueChange={(value) => setForm((current) => ({ ...current, serviceType: value }))} options={serviceTypeOptions} placeholder="Chọn loại" value={form.serviceType} />
                <SelectField label="Nhà cung cấp" name="service-provider" onValueChange={(value) => setForm((current) => ({ ...current, providerId: value || null }))} options={providerOptions} placeholder="Bỏ trống" value={form.providerId ?? ""} />
                <TextInput error={formErrors.name} label="Tên dịch vụ" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
                <SelectField error={formErrors.status} label="Trạng thái" name="service-status" onValueChange={(value) => setForm((current) => ({ ...current, status: value as ServiceCatalogMutationRequest["status"] }))} options={statusOptions} placeholder="Chọn trạng thái" value={form.status} />
                <TextInput error={formErrors.basePrice} label="Giá" value={form.basePrice} onChange={(value) => setForm((current) => ({ ...current, basePrice: value }))} />
                <TextInput error={formErrors.currency} label="Tiền tệ" value={form.currency} onChange={(value) => setForm((current) => ({ ...current, currency: value.toUpperCase() }))} />
              </div>
              <label className="space-y-2"><span className="text-sm font-semibold">Mô tả</span><textarea className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <div className="flex flex-wrap gap-3"><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-70" disabled={saveMutation.isPending || !destinationId} type="submit"><FiSave size={17} />{selectedFiles.length > 0 ? `Lưu và upload ${selectedFiles.length} ảnh` : "Lưu dịch vụ"}</button><button className="inline-flex h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold dark:border-neutral-800" onClick={resetForm} type="button">Làm mới</button></div>
            </form>
          </InternalPanel>
          <MediaPanel disabled={!editing || saveMutation.isPending} emptyLabel={editing ? "Chưa có ảnh trong gallery." : "Lưu dịch vụ trước khi upload ảnh."} media={media as MediaItem[]} mediaPending={mediaQuery.isLoading} onDeleteMedia={(item) => setDangerAction({ kind: "delete-media", media: item as InternalServiceMedia })} onSelectFiles={setSelectedFiles} onSetCover={(item) => setCoverMutation.mutate(item as InternalServiceMedia)} onUpload={() => uploadMutation.mutate()} selectedFiles={selectedFiles} targetLabel={editing ? `Ảnh của ${editing.name}` : "Ảnh dịch vụ"} uploadPending={uploadMutation.isPending} />
        </div>
      ) : null}

      {activeTab === "list" ? <ServiceListPanel destinationId={destinationId} destinationOptions={destinationOptions} empty={listQuery.isLoading || isPaging ? "Đang tải dịch vụ..." : "Không tìm thấy dịch vụ phù hợp."} hardPending={hardDeleteMutation.isPending} items={list} pageProps={{ currentPage: page, hasNextPage: Boolean(listQuery.data?.nextCursor), hasPreviousPage: page > 1, isPaging: isPaging || listQuery.isFetching, itemLabel: "dịch vụ", onJumpToPage: (next) => jumpToPage(next, { limit: pageSize, q: searchQuery, setCursors, setPage, status }), onNextPage: () => { if (listQuery.data?.nextCursor) { setCursors((current) => ({ ...current, [page + 1]: listQuery.data?.nextCursor ?? null })); setPage((current) => current + 1); } }, onPreviousPage: () => setPage((current) => Math.max(1, current - 1)), pageSize, visible: list.length > 0 }} searchProps={{ pageSize, searchQuery, setPageSize: (value) => { setPageSize(value); resetListPage(); }, setSearchQuery: (value) => { setSearchQuery(value); resetListPage(); } }} status={status} setDestinationId={(value) => { setDestinationId(value); resetListPage(); resetArchivedPage(); resetMediaPage(); }} setStatus={(value) => { setStatus(value); resetListPage(); }} onArchive={(service) => setDangerAction({ kind: "archive", service })} onEdit={(service) => startEdit(service)} onHardDelete={(service) => setDangerAction({ kind: "hard-delete", service })} onMedia={(service) => { setMediaTarget(service); router.push("/internal/services/media"); }} /> : null}

      {activeTab === "archived" ? <ServiceListPanel archived destinationId={destinationId} destinationOptions={destinationOptions} empty={archivedQuery.isLoading || isPaging ? "Đang tải archived..." : "Không có dịch vụ archived."} hardPending={hardDeleteMutation.isPending} items={archived} pageProps={{ currentPage: archivedPage, hasNextPage: Boolean(archivedQuery.data?.nextCursor), hasPreviousPage: archivedPage > 1, isPaging: isPaging || archivedQuery.isFetching, itemLabel: "dịch vụ archived", onJumpToPage: (next) => jumpToPage(next, { limit: archivedPageSize, q: archivedSearchQuery, setCursors: setArchivedCursors, setPage: setArchivedPage, status: "archived" }), onNextPage: () => { if (archivedQuery.data?.nextCursor) { setArchivedCursors((current) => ({ ...current, [archivedPage + 1]: archivedQuery.data?.nextCursor ?? null })); setArchivedPage((current) => current + 1); } }, onPreviousPage: () => setArchivedPage((current) => Math.max(1, current - 1)), pageSize: archivedPageSize, visible: archived.length > 0 }} searchProps={{ pageSize: archivedPageSize, searchQuery: archivedSearchQuery, setPageSize: (value) => { setArchivedPageSize(value); resetArchivedPage(); }, setSearchQuery: (value) => { setArchivedSearchQuery(value); resetArchivedPage(); } }} status="archived" setDestinationId={(value) => { setDestinationId(value); resetArchivedPage(); }} setStatus={() => undefined} onHardDelete={(service) => setDangerAction({ kind: "hard-delete", service })} onRestore={(service) => setDangerAction({ kind: "restore", service })} /> : null}

      {activeTab === "media" ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <ServiceListPanel compact destinationId={destinationId} destinationOptions={destinationOptions} empty={mediaListQuery.isLoading || isPaging ? "Đang tải dịch vụ..." : "Không có dịch vụ để quản lý ảnh."} hardPending={hardDeleteMutation.isPending} items={mediaList} pageProps={{ currentPage: mediaPage, hasNextPage: Boolean(mediaListQuery.data?.nextCursor), hasPreviousPage: mediaPage > 1, isPaging: isPaging || mediaListQuery.isFetching, itemLabel: "dịch vụ", onJumpToPage: (next) => jumpToPage(next, { limit: mediaPageSize, q: mediaSearchQuery, setCursors: setMediaCursors, setPage: setMediaPage, status: "published" }), onNextPage: () => { if (mediaListQuery.data?.nextCursor) { setMediaCursors((current) => ({ ...current, [mediaPage + 1]: mediaListQuery.data?.nextCursor ?? null })); setMediaPage((current) => current + 1); } }, onPreviousPage: () => setMediaPage((current) => Math.max(1, current - 1)), pageSize: mediaPageSize, visible: mediaList.length > 0 }} searchProps={{ pageSize: mediaPageSize, searchQuery: mediaSearchQuery, setPageSize: (value) => { setMediaPageSize(value); resetMediaPage(); }, setSearchQuery: (value) => { setMediaSearchQuery(value); resetMediaPage(); } }} status="published" setDestinationId={(value) => { setDestinationId(value); resetMediaPage(); }} setStatus={() => undefined} onMedia={setMediaTarget} selectedServiceId={activeMediaTarget?.serviceId} />
          <MediaPanel disabled={!activeMediaTarget || uploadMutation.isPending} emptyLabel="Chưa có ảnh trong gallery." media={media as MediaItem[]} mediaPending={mediaQuery.isLoading} onDeleteMedia={(item) => setDangerAction({ kind: "delete-media", media: item as InternalServiceMedia })} onSelectFiles={setSelectedFiles} onSetCover={(item) => setCoverMutation.mutate(item as InternalServiceMedia)} onUpload={() => uploadMutation.mutate()} selectedFiles={selectedFiles} targetLabel={activeMediaTarget ? `Ảnh của ${activeMediaTarget.name}` : "Chọn dịch vụ để quản lý ảnh"} uploadPending={uploadMutation.isPending} />
        </div>
      ) : null}

      <ConfirmModal confirmLabel={dangerAction?.kind === "restore" ? "Khôi phục" : dangerAction?.kind === "hard-delete" ? "Xóa vĩnh viễn" : dangerAction?.kind === "delete-media" ? "Xóa ảnh" : "Lưu trữ"} description={dangerAction?.kind === "hard-delete" ? "Dịch vụ và toàn bộ ảnh sẽ bị xóa vĩnh viễn." : dangerAction?.kind === "restore" ? "Dịch vụ sẽ quay lại trạng thái trước khi archived." : dangerAction?.kind === "delete-media" ? "Ảnh sẽ bị xóa khỏi gallery." : "Dịch vụ sẽ chuyển sang archived."} open={dangerAction !== null} onCancel={() => setDangerAction(null)} onConfirm={confirmDangerAction} title={dangerAction?.kind === "hard-delete" ? "Xóa vĩnh viễn?" : dangerAction?.kind === "restore" ? "Khôi phục?" : dangerAction?.kind === "delete-media" ? "Xóa ảnh?" : "Lưu trữ?"} />
    </div>
  );
}

function TextInput({ error, label, onChange, value }: { error?: string; label: string; onChange: (value: string) => void; value: string }) {
  return <label className="space-y-2"><span className="text-sm font-semibold">{label}</span><input className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none dark:bg-black ${error ? "border-rose-300" : "border-slate-200 dark:border-neutral-800"}`} value={value} onChange={(event) => onChange(event.target.value)} />{error ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{error}</p> : null}</label>;
}

function ServiceListPanel({
  archived = false,
  compact = false,
  destinationId,
  destinationOptions,
  empty,
  hardPending,
  items,
  onArchive,
  onEdit,
  onHardDelete,
  onMedia,
  onRestore,
  pageProps,
  searchProps,
  selectedServiceId,
  setDestinationId,
  setStatus,
  status,
}: {
  archived?: boolean;
  compact?: boolean;
  destinationId: string;
  destinationOptions: { label: string; value: string }[];
  empty: string;
  hardPending: boolean;
  items: InternalServiceCatalog[];
  onArchive?: (service: InternalServiceCatalog) => void;
  onEdit?: (service: InternalServiceCatalog) => void;
  onHardDelete?: (service: InternalServiceCatalog) => void;
  onMedia?: (service: InternalServiceCatalog) => void;
  onRestore?: (service: InternalServiceCatalog) => void;
  pageProps: React.ComponentProps<typeof WorkspacePagination>;
  searchProps: React.ComponentProps<typeof ListFilters>;
  selectedServiceId?: string;
  setDestinationId: (value: string) => void;
  setStatus: (value: string) => void;
  status: string;
}) {
  return (
    <InternalPanel className="p-4">
      <ListFilters {...searchProps}>
        <InlineSelect label="Điểm đến" name="service-filter-destination" onChange={setDestinationId} options={destinationOptions} value={destinationId} />
        {archived ? <InlineSelect label="Trạng thái" name="service-filter-archived" onChange={() => undefined} options={archivedStatusOptions} value="archived" /> : <InlineSelect label="Trạng thái" name="service-filter-status" onChange={setStatus} options={statusOptions} value={status} />}
      </ListFilters>
      {!destinationId ? <div className="mt-4"><EmptyState message="Chọn một địa điểm để xem dịch vụ." /></div> : items.length === 0 ? <div className="mt-4"><EmptyState message={empty} /></div> : <div className="mt-4 grid gap-4 xl:grid-cols-2">{items.map((service) => <ServiceCard archived={archived} compact={compact} hardPending={hardPending} key={service.serviceId} onArchive={onArchive} onEdit={onEdit} onHardDelete={onHardDelete} onMedia={onMedia} onRestore={onRestore} selected={selectedServiceId === service.serviceId} service={service} />)}</div>}
      <WorkspacePagination {...pageProps} />
    </InternalPanel>
  );
}

function ServiceCard({ archived, compact, hardPending, onArchive, onEdit, onHardDelete, onMedia, onRestore, selected, service }: { archived?: boolean; compact?: boolean; hardPending: boolean; onArchive?: (service: InternalServiceCatalog) => void; onEdit?: (service: InternalServiceCatalog) => void; onHardDelete?: (service: InternalServiceCatalog) => void; onMedia?: (service: InternalServiceCatalog) => void; onRestore?: (service: InternalServiceCatalog) => void; selected?: boolean; service: InternalServiceCatalog }) {
  return (
    <article className={`rounded-2xl border bg-white p-3 dark:bg-black ${selected ? "border-sky-300 dark:border-sky-900" : "border-slate-200 dark:border-neutral-800"}`}>
      <div className="flex gap-3">
        <Thumb alt={service.name} thumbnailUrl={service.thumbnailUrl} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{service.name}</p><p className="mt-1 text-xs text-slate-500">{service.serviceType} - {service.currency} {Number(service.basePrice).toLocaleString("vi-VN")}</p></div><StatusPill value={service.status} /></div>
          {!compact ? <p className="line-clamp-2 text-sm text-slate-600 dark:text-neutral-400">{service.description || "Không có mô tả."}</p> : null}
          <div className="flex flex-wrap gap-2">
            {archived ? <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700" onClick={() => onRestore?.(service)} type="button"><FiRefreshCw size={14} />Restore</button> : <>
              {!compact ? <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-neutral-800" onClick={() => onEdit?.(service)} type="button"><FiEdit2 size={14} />Sửa</button> : null}
              <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-neutral-800" onClick={() => onMedia?.(service)} type="button"><FiImage size={14} />Ảnh</button>
              {!compact ? <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700" onClick={() => onArchive?.(service)} type="button"><FiTrash2 size={14} />Soft delete</button> : null}
            </>}
            {!compact ? <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 disabled:opacity-70" disabled={hardPending} onClick={() => onHardDelete?.(service)} type="button"><FiTrash2 size={14} />Hard delete</button> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
