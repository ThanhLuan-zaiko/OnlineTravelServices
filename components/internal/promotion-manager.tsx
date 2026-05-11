"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { FiArchive, FiBarChart2, FiEdit2, FiGift, FiGrid, FiImage, FiPlus, FiRefreshCw, FiSave, FiTrash2 } from "react-icons/fi";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  archiveInternalPromotion,
  createInternalPromotion,
  deleteInternalPromotionMedia,
  getInternalPromotion,
  getInternalPromotionMedia,
  getInternalPromotionPage,
  getInternalPromotions,
  hardDeleteInternalPromotion,
  restoreInternalPromotion,
  setInternalPromotionMediaCover,
  updateInternalPromotion,
  uploadInternalPromotionMedia,
  type ApiError,
} from "@/lib/client/api-client";
import {
  promotionMutationSchema,
  type InternalPromotion,
  type InternalPromotionMedia,
  type PromotionMutationRequest,
} from "@/lib/shared/internal";

import {
  InlineSelect,
  ListFilters,
  MediaPanel,
  Thumb,
  WorkspacePagination,
  WorkspaceTabs,
  type MediaItem,
} from "./catalog-workspace-ui";
import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

type PromotionTab = "archived" | "effectiveness" | "list" | "manage" | "media";
type DangerAction =
  | { kind: "archive"; promotion: InternalPromotion }
  | { kind: "delete-media"; media: InternalPromotionMedia }
  | { kind: "hard-delete"; promotion: InternalPromotion }
  | { kind: "restore"; promotion: InternalPromotion }
  | null;

const initialForm: PromotionMutationRequest = {
  code: "",
  customerSegment: "all",
  customerTier: "standard",
  description: "",
  discountType: "percent",
  discountValue: "10",
  endAt: "",
  maxDiscountAmount: null,
  promotionType: "campaign",
  regularGiftTitle: "",
  startAt: "",
  status: "draft",
  title: "",
  usageLimit: 100,
  vipDiscountPriority: 20,
  vipGiftTitle: "",
};

const statusOptions = [
  { label: "draft", value: "draft" },
  { label: "scheduled", value: "scheduled" },
  { label: "published", value: "published" },
  { label: "expired", value: "expired" },
];

const archivedStatusOptions = [{ label: "archived", value: "archived" }];
const discountTypeOptions = [
  { label: "percent", value: "percent" },
  { label: "amount", value: "amount" },
];
const customerSegmentOptions = [
  { label: "Tất cả", value: "all" },
  { label: "Khách thường", value: "regular" },
  { label: "VIP", value: "vip" },
];
const customerTierOptions = [
  { label: "standard", value: "standard" },
  { label: "silver", value: "silver" },
  { label: "gold", value: "gold" },
  { label: "platinum", value: "platinum" },
];

const tabs = [
  { href: "/internal/promotions/manage", icon: FiGift, label: "Tạo + Sửa" },
  { href: "/internal/promotions/list", icon: FiGrid, label: "Danh sách" },
  { href: "/internal/promotions/archived", icon: FiArchive, label: "Archived" },
  { href: "/internal/promotions/media", icon: FiImage, label: "Kho ảnh" },
  { href: "/internal/promotions/effectiveness", icon: FiBarChart2, label: "Hiệu quả" },
];

function getActiveTab(pathname: string): PromotionTab {
  if (pathname.startsWith("/internal/promotions/list")) return "list";
  if (pathname.startsWith("/internal/promotions/archived")) return "archived";
  if (pathname.startsWith("/internal/promotions/media")) return "media";
  if (pathname.startsWith("/internal/promotions/effectiveness")) return "effectiveness";
  return "manage";
}

function pageCopy(tab: PromotionTab) {
  if (tab === "list") return { title: "Danh sách khuyến mãi", description: "Tìm kiếm, phân trang, sửa nhanh, soft delete và hard delete khuyến mãi." };
  if (tab === "archived") return { title: "Khuyến mãi archived", description: "Khôi phục hoặc xóa vĩnh viễn các chiến dịch đã lưu trữ." };
  if (tab === "media") return { title: "Kho ảnh khuyến mãi", description: "Upload, đặt cover và dọn gallery ảnh cho từng chương trình." };
  if (tab === "effectiveness") return { title: "Hiệu quả khuyến mãi", description: "Đánh giá chương trình tốt/xấu theo lượt dùng, giới hạn, doanh thu và ưu tiên VIP." };
  return { title: "Tạo và chỉnh sửa khuyến mãi", description: "Quản lý mã, thời gian áp dụng, hạng khách hàng và ảnh chiến dịch." };
}

function toDateTimeInput(value: string) {
  return value ? value.slice(0, 16) : "";
}

function buildForm(promotion: InternalPromotion): PromotionMutationRequest {
  return {
    code: promotion.code,
    customerSegment: promotion.customerSegment,
    customerTier: promotion.customerTier,
    description: promotion.description,
    discountType: promotion.discountType,
    discountValue: promotion.discountValue,
    endAt: toDateTimeInput(promotion.endAt),
    maxDiscountAmount: promotion.maxDiscountAmount,
    promotionType: promotion.promotionType,
    regularGiftTitle: promotion.regularGiftTitle,
    startAt: toDateTimeInput(promotion.startAt),
    status: promotion.status === "archived" ? promotion.archivedFromStatus ?? "draft" : promotion.status,
    title: promotion.title,
    usageLimit: promotion.usageLimit,
    vipDiscountPriority: promotion.vipDiscountPriority,
    vipGiftTitle: promotion.vipGiftTitle,
  };
}

function slugify(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "promotion";
}

function buildEditHref(promotion: InternalPromotion) {
  return `/internal/promotions/manage/edit/${slugify(promotion.title)}-${promotion.promotionId}`;
}

function extractPromotionId(pathname: string) {
  return pathname.match(/\/internal\/promotions\/manage\/edit\/.*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i)?.[1] ?? null;
}

export function PromotionManager() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = getActiveTab(pathname);
  const copy = pageCopy(activeTab);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const loadedEditIdRef = useRef<string | null>(null);
  const editId = extractPromotionId(pathname);

  const [editing, setEditing] = useState<InternalPromotion | null>(null);
  const [mediaTarget, setMediaTarget] = useState<InternalPromotion | null>(null);
  const [form, setForm] = useState<PromotionMutationRequest>(initialForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PromotionMutationRequest, string>>>({});
  const [dangerAction, setDangerAction] = useState<DangerAction>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("published");
  const [archivedStatus] = useState("archived");
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

  const resetListPage = () => {
    setPage(1);
    setCursors({ 1: null });
  };

  const resetArchivedPage = () => {
    setArchivedPage(1);
    setArchivedCursors({ 1: null });
  };

  const resetMediaPage = () => {
    setMediaPage(1);
    setMediaCursors({ 1: null });
  };

  useEffect(() => {
    if (!editId || loadedEditIdRef.current === editId) return;
    loadedEditIdRef.current = editId;
    void getInternalPromotion(editId)
      .then((response) => {
        setEditing(response.promotion);
        setMediaTarget(response.promotion);
        setForm(buildForm(response.promotion));
        setFormErrors({});
      })
      .catch(() => {
        loadedEditIdRef.current = null;
        showToast({ title: "Không thể tải khuyến mãi", message: "URL chỉnh sửa không hợp lệ hoặc dữ liệu đã bị xóa.", variant: "error" });
      });
  }, [editId, showToast]);

  const listQuery = useQuery({
    queryKey: ["internal", "promotions", "page", status, searchQuery, pageSize, cursors[page], page] as const,
    queryFn: () => getInternalPromotionPage({ cursor: cursors[page] ?? null, limit: pageSize, q: searchQuery, status }),
  });
  const archivedQuery = useQuery({
    queryKey: ["internal", "promotions", "page", archivedStatus, archivedSearchQuery, archivedPageSize, archivedCursors[archivedPage], archivedPage] as const,
    queryFn: () => getInternalPromotionPage({ cursor: archivedCursors[archivedPage] ?? null, limit: archivedPageSize, q: archivedSearchQuery, status: archivedStatus }),
  });
  const mediaListQuery = useQuery({
    queryKey: ["internal", "promotions", "page", "media", mediaSearchQuery, mediaPageSize, mediaCursors[mediaPage], mediaPage] as const,
    queryFn: () => getInternalPromotionPage({ cursor: mediaCursors[mediaPage] ?? null, limit: mediaPageSize, q: mediaSearchQuery, status: "published" }),
  });
  const effectivenessQuery = useQuery({
    queryKey: ["internal", "promotions", "effectiveness"] as const,
    queryFn: () => getInternalPromotions(),
  });
  const mediaQuery = useQuery({
    enabled: Boolean((mediaTarget ?? editing)?.promotionId),
    queryKey: ["internal", "promotion-media", (mediaTarget ?? editing)?.promotionId] as const,
    queryFn: () => getInternalPromotionMedia((mediaTarget ?? editing)?.promotionId ?? ""),
  });

  const statsQuery = useQuery({
    queryKey: ["internal", "promotions", "stats"] as const,
    queryFn: () => getInternalPromotionPage({ limit: 200 }),
  });
  const stats = useMemo(() => {
    const items = statsQuery.data?.promotions ?? [];
    return {
      archived: items.filter((item) => item.status === "archived").length,
      published: items.filter((item) => item.status === "published").length,
      scheduled: items.filter((item) => item.status === "scheduled").length,
      total: items.length,
      withImage: items.filter((item) => item.thumbnailUrl).length,
    };
  }, [statsQuery.data?.promotions]);

  const saveMutation = useMutation({
    mutationFn: (input: PromotionMutationRequest) => editing ? updateInternalPromotion(editing.promotionId, input) : createInternalPromotion(input),
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotions"] });
      setEditing(response.promotion);
      setMediaTarget(response.promotion);
      setForm(buildForm(response.promotion));
      if (selectedFiles.length > 0) {
        await uploadInternalPromotionMedia(response.promotion.promotionId, { files: selectedFiles, isCover: !response.promotion.imageUrl });
        setSelectedFiles([]);
        await queryClient.invalidateQueries({ queryKey: ["internal", "promotion-media", response.promotion.promotionId] });
      }
      showToast({ message: "Khuyến mãi đã được lưu.", title: "Lưu thành công", variant: "success" });
    },
    onError: (error) => showToast({ message: (error as ApiError).message, title: "Không thể lưu", variant: "error" }),
  });
  const archiveMutation = useMutation({
    mutationFn: (promotion: InternalPromotion) => archiveInternalPromotion(promotion.promotionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotions"] });
      showToast({ message: "Khuyến mãi đã chuyển sang archived.", title: "Đã lưu trữ", variant: "success" });
    },
  });
  const hardDeleteMutation = useMutation({
    mutationFn: (promotion: InternalPromotion) => hardDeleteInternalPromotion(promotion.promotionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotions"] });
      resetForm();
      showToast({ message: "Khuyến mãi đã bị xóa vĩnh viễn.", title: "Đã xóa", variant: "success" });
    },
  });
  const restoreMutation = useMutation({
    mutationFn: (promotion: InternalPromotion) => restoreInternalPromotion(promotion.promotionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotions"] });
      showToast({ message: "Khuyến mãi đã được khôi phục.", title: "Đã khôi phục", variant: "success" });
    },
  });
  const uploadMutation = useMutation({
    mutationFn: () => uploadInternalPromotionMedia((mediaTarget ?? editing)?.promotionId ?? "", { files: selectedFiles, isCover: (mediaQuery.data?.media ?? []).length === 0 }),
    onSuccess: async () => {
      setSelectedFiles([]);
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotion-media", (mediaTarget ?? editing)?.promotionId] });
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotions"] });
    },
  });
  const deleteMediaMutation = useMutation({
    mutationFn: (media: InternalPromotionMedia) => deleteInternalPromotionMedia((mediaTarget ?? editing)?.promotionId ?? "", media.mediaId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotion-media", (mediaTarget ?? editing)?.promotionId] });
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotions"] });
    },
  });
  const setCoverMutation = useMutation({
    mutationFn: (media: InternalPromotionMedia) => setInternalPromotionMediaCover((mediaTarget ?? editing)?.promotionId ?? "", media.mediaId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotion-media", (mediaTarget ?? editing)?.promotionId] });
      await queryClient.invalidateQueries({ queryKey: ["internal", "promotions"] });
    },
  });

  function resetForm() {
    setEditing(null);
    setForm(initialForm);
    setFormErrors({});
    setSelectedFiles([]);
  }

  function startEdit(promotion: InternalPromotion, preserveUrl = false) {
    setEditing(promotion);
    setMediaTarget(promotion);
    setForm(buildForm(promotion));
    setFormErrors({});
    if (!preserveUrl) router.push(buildEditHref(promotion));
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = promotionMutationSchema.safeParse(form);
    if (!parsed.success) {
      setFormErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as Partial<Record<keyof PromotionMutationRequest, string>>);
      return;
    }
    saveMutation.mutate(parsed.data);
  };

  const jumpToPage = async (
    targetPage: number,
    context: { limit: number; q: string; setCursors: (value: Record<number, string | null>) => void; setPage: (value: number) => void; status?: string },
  ) => {
    if (targetPage < 1) return;
    setIsPaging(true);
    try {
      const nextCursors: Record<number, string | null> = { 1: null };
      let cursor: string | null = null;
      for (let index = 1; index < targetPage; index += 1) {
        const response = await getInternalPromotionPage({ cursor, limit: context.limit, q: context.q, status: context.status });
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
    if (dangerAction?.kind === "archive") archiveMutation.mutate(dangerAction.promotion);
    if (dangerAction?.kind === "hard-delete") hardDeleteMutation.mutate(dangerAction.promotion);
    if (dangerAction?.kind === "restore") restoreMutation.mutate(dangerAction.promotion);
    if (dangerAction?.kind === "delete-media") deleteMediaMutation.mutate(dangerAction.media);
    setDangerAction(null);
  };

  const list = listQuery.data?.promotions ?? [];
  const archived = archivedQuery.data?.promotions ?? [];
  const mediaList = mediaListQuery.data?.promotions ?? [];
  const activeMediaTarget = mediaTarget ?? editing;
  const media = mediaQuery.data?.media ?? [];

  return (
    <div className="space-y-5">
      <InternalPageHeader
        action={
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            onClick={() => {
              resetForm();
              router.push(activeTab === "manage" ? "/internal/promotions/list" : "/internal/promotions/manage");
            }}
            type="button"
          >
            {activeTab === "manage" ? <FiGrid size={17} /> : <FiPlus size={17} />}
            {activeTab === "manage" ? "Danh sách" : "Khuyến mãi mới"}
          </button>
        }
        description={copy.description}
        title={copy.title}
      />

      <WorkspaceTabs pathname={pathname} tabs={tabs} />
      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["Tổng", stats.total],
          ["Published", stats.published],
          ["Scheduled", stats.scheduled],
          ["Có ảnh", stats.withImage],
          ["Archived", stats.archived],
        ].map(([label, value]) => (
          <InternalPanel className="p-4" key={label}>
            <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
          </InternalPanel>
        ))}
      </div>

      {activeTab === "manage" ? (
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <InternalPanel className="p-4">
            <h3 className="text-base font-semibold">{editing ? "Cập nhật khuyến mãi" : "Tạo khuyến mãi"}</h3>
            <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput error={formErrors.code} label="Mã" value={form.code} onChange={(value) => setForm((current) => ({ ...current, code: value }))} />
                <TextInput error={formErrors.title} label="Tên" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
                <SelectField error={formErrors.status} label="Trạng thái" name="promotion-status" onValueChange={(value) => setForm((current) => ({ ...current, status: value as PromotionMutationRequest["status"] }))} options={statusOptions} placeholder="Chọn trạng thái" value={form.status} />
                <SelectField error={formErrors.customerSegment} label="Nhóm khách" name="promotion-customer-segment" onValueChange={(value) => setForm((current) => ({ ...current, customerSegment: value as PromotionMutationRequest["customerSegment"] }))} options={customerSegmentOptions} placeholder="Nhóm khách" value={form.customerSegment} />
                <SelectField error={formErrors.customerTier} label="Hạng khách" name="promotion-customer-tier" onValueChange={(value) => setForm((current) => ({ ...current, customerTier: value }))} options={customerTierOptions} placeholder="Hạng khách" value={form.customerTier} />
                <SelectField label="Loại giảm" name="promotion-discount-type" onValueChange={(value) => setForm((current) => ({ ...current, discountType: value as PromotionMutationRequest["discountType"] }))} options={discountTypeOptions} placeholder="Chọn loại" value={form.discountType} />
                <TextInput error={formErrors.discountValue} label="Giá trị" value={form.discountValue} onChange={(value) => setForm((current) => ({ ...current, discountValue: value }))} />
                <TextInput error={formErrors.maxDiscountAmount} label="Giảm tối đa" value={form.maxDiscountAmount ?? ""} onChange={(value) => setForm((current) => ({ ...current, maxDiscountAmount: value || null }))} />
                <TextInput error={formErrors.promotionType} label="Loại chương trình" value={form.promotionType} onChange={(value) => setForm((current) => ({ ...current, promotionType: value }))} />
                <TextInput error={formErrors.regularGiftTitle} label="Quà khách thường" value={form.regularGiftTitle ?? ""} onChange={(value) => setForm((current) => ({ ...current, regularGiftTitle: value || null }))} />
                <TextInput error={formErrors.vipGiftTitle} label="Quà VIP" value={form.vipGiftTitle ?? ""} onChange={(value) => setForm((current) => ({ ...current, vipGiftTitle: value || null }))} />
                <TextInput error={formErrors.vipDiscountPriority} label="Ưu tiên giảm VIP (%)" type="number" value={String(form.vipDiscountPriority)} onChange={(value) => setForm((current) => ({ ...current, vipDiscountPriority: Number(value) }))} />
                <TextInput error={formErrors.startAt} label="Bắt đầu" type="datetime-local" value={form.startAt} onChange={(value) => setForm((current) => ({ ...current, startAt: value }))} />
                <TextInput error={formErrors.endAt} label="Kết thúc" type="datetime-local" value={form.endAt} onChange={(value) => setForm((current) => ({ ...current, endAt: value }))} />
                <TextInput error={formErrors.usageLimit} label="Giới hạn sử dụng" type="number" value={String(form.usageLimit)} onChange={(value) => setForm((current) => ({ ...current, usageLimit: Number(value) }))} />
              </div>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Mô tả</span>
                <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-neutral-800 dark:bg-black" value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
              </label>
              <div className="flex flex-wrap gap-3">
                <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-70" disabled={saveMutation.isPending} type="submit">
                  <FiSave size={17} />
                  {selectedFiles.length > 0 ? `Lưu và upload ${selectedFiles.length} ảnh` : "Lưu khuyến mãi"}
                </button>
                <button className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold dark:border-neutral-800" onClick={resetForm} type="button">Làm mới</button>
              </div>
            </form>
          </InternalPanel>
          <MediaPanel
            disabled={!editing || saveMutation.isPending}
            emptyLabel={editing ? "Chưa có ảnh trong gallery." : "Lưu khuyến mãi trước hoặc chọn ảnh để upload sau khi lưu."}
            fileSelectionDisabled={saveMutation.isPending}
            media={media as MediaItem[]}
            mediaPending={mediaQuery.isLoading}
            onDeleteMedia={(item) => setDangerAction({ kind: "delete-media", media: item as InternalPromotionMedia })}
            onSelectFiles={setSelectedFiles}
            onSetCover={(item) => setCoverMutation.mutate(item as InternalPromotionMedia)}
            onUpload={() => uploadMutation.mutate()}
            selectedFiles={selectedFiles}
            targetLabel={editing ? `Ảnh của ${editing.title}` : "Ảnh khuyến mãi"}
            uploadPending={uploadMutation.isPending}
          />
        </div>
      ) : null}

      {activeTab === "list" ? (
        <InternalPanel className="p-4">
          <ListFilters pageSize={pageSize} searchQuery={searchQuery} setPageSize={(value) => { setPageSize(value); resetListPage(); }} setSearchQuery={(value) => { setSearchQuery(value); resetListPage(); }}>
            <InlineSelect label="Trạng thái" name="promotion-filter-status" onChange={(value) => { setStatus(value); resetListPage(); }} options={statusOptions} value={status} />
          </ListFilters>
          <PromotionCards
            empty={listQuery.isLoading || isPaging ? "Đang tải khuyến mãi..." : "Không tìm thấy khuyến mãi phù hợp."}
            hardPending={hardDeleteMutation.isPending}
            items={list}
            onArchive={(promotion) => setDangerAction({ kind: "archive", promotion })}
            onEdit={(promotion) => startEdit(promotion)}
            onHardDelete={(promotion) => setDangerAction({ kind: "hard-delete", promotion })}
            onMedia={(promotion) => {
              setMediaTarget(promotion);
              router.push("/internal/promotions/media");
            }}
          />
          <WorkspacePagination currentPage={page} hasNextPage={Boolean(listQuery.data?.nextCursor)} hasPreviousPage={page > 1} isPaging={isPaging || listQuery.isFetching} itemLabel="khuyến mãi" onJumpToPage={(next) => jumpToPage(next, { limit: pageSize, q: searchQuery, setCursors, setPage, status })} onNextPage={() => { if (listQuery.data?.nextCursor) { setCursors((current) => ({ ...current, [page + 1]: listQuery.data?.nextCursor ?? null })); setPage((current) => current + 1); } }} onPreviousPage={() => setPage((current) => Math.max(1, current - 1))} pageSize={pageSize} visible={list.length > 0} />
        </InternalPanel>
      ) : null}

      {activeTab === "archived" ? (
        <InternalPanel className="p-4">
          <ListFilters pageSize={archivedPageSize} searchQuery={archivedSearchQuery} setPageSize={(value) => { setArchivedPageSize(value); resetArchivedPage(); }} setSearchQuery={(value) => { setArchivedSearchQuery(value); resetArchivedPage(); }}>
            <InlineSelect label="Trạng thái" name="promotion-archived-status" onChange={() => undefined} options={archivedStatusOptions} value="archived" />
          </ListFilters>
          <PromotionCards archived empty={archivedQuery.isLoading || isPaging ? "Đang tải archived..." : "Không có khuyến mãi archived."} hardPending={hardDeleteMutation.isPending} items={archived} onHardDelete={(promotion) => setDangerAction({ kind: "hard-delete", promotion })} onRestore={(promotion) => setDangerAction({ kind: "restore", promotion })} />
          <WorkspacePagination currentPage={archivedPage} hasNextPage={Boolean(archivedQuery.data?.nextCursor)} hasPreviousPage={archivedPage > 1} isPaging={isPaging || archivedQuery.isFetching} itemLabel="khuyến mãi archived" onJumpToPage={(next) => jumpToPage(next, { limit: archivedPageSize, q: archivedSearchQuery, setCursors: setArchivedCursors, setPage: setArchivedPage, status: "archived" })} onNextPage={() => { if (archivedQuery.data?.nextCursor) { setArchivedCursors((current) => ({ ...current, [archivedPage + 1]: archivedQuery.data?.nextCursor ?? null })); setArchivedPage((current) => current + 1); } }} onPreviousPage={() => setArchivedPage((current) => Math.max(1, current - 1))} pageSize={archivedPageSize} visible={archived.length > 0} />
        </InternalPanel>
      ) : null}

      {activeTab === "media" ? (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <InternalPanel className="p-4">
            <ListFilters pageSize={mediaPageSize} searchQuery={mediaSearchQuery} setPageSize={(value) => { setMediaPageSize(value); resetMediaPage(); }} setSearchQuery={(value) => { setMediaSearchQuery(value); resetMediaPage(); }} />
            <div className="mt-4 space-y-3">
              {mediaList.length === 0 ? <EmptyState message={mediaListQuery.isLoading ? "Đang tải khuyến mãi..." : "Không có khuyến mãi để quản lý ảnh."} /> : mediaList.map((promotion) => (
                <button className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${activeMediaTarget?.promotionId === promotion.promotionId ? "border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30" : "border-slate-200 bg-white dark:border-neutral-800 dark:bg-black"}`} key={promotion.promotionId} onClick={() => setMediaTarget(promotion)} type="button">
                  <Thumb alt={promotion.title} thumbnailUrl={promotion.thumbnailUrl} />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{promotion.title}</span>
                    <span className="mt-1 block text-xs text-slate-500">{promotion.code}</span>
                  </span>
                </button>
              ))}
            </div>
            <WorkspacePagination currentPage={mediaPage} hasNextPage={Boolean(mediaListQuery.data?.nextCursor)} hasPreviousPage={mediaPage > 1} isPaging={isPaging || mediaListQuery.isFetching} itemLabel="khuyến mãi" onJumpToPage={(next) => jumpToPage(next, { limit: mediaPageSize, q: mediaSearchQuery, setCursors: setMediaCursors, setPage: setMediaPage, status: "published" })} onNextPage={() => { if (mediaListQuery.data?.nextCursor) { setMediaCursors((current) => ({ ...current, [mediaPage + 1]: mediaListQuery.data?.nextCursor ?? null })); setMediaPage((current) => current + 1); } }} onPreviousPage={() => setMediaPage((current) => Math.max(1, current - 1))} pageSize={mediaPageSize} visible={mediaList.length > 0} />
          </InternalPanel>
          <MediaPanel disabled={!activeMediaTarget || uploadMutation.isPending} emptyLabel="Chưa có ảnh trong gallery." media={media as MediaItem[]} mediaPending={mediaQuery.isLoading} onDeleteMedia={(item) => setDangerAction({ kind: "delete-media", media: item as InternalPromotionMedia })} onSelectFiles={setSelectedFiles} onSetCover={(item) => setCoverMutation.mutate(item as InternalPromotionMedia)} onUpload={() => uploadMutation.mutate()} selectedFiles={selectedFiles} targetLabel={activeMediaTarget ? `Ảnh của ${activeMediaTarget.title}` : "Chọn khuyến mãi để quản lý ảnh"} uploadPending={uploadMutation.isPending} />
        </div>
      ) : null}

      {activeTab === "effectiveness" ? (
        <InternalPanel className="p-4">
          <PromotionEffectiveness items={effectivenessQuery.data?.promotions ?? []} loading={effectivenessQuery.isLoading} />
        </InternalPanel>
      ) : null}

      <ConfirmModal
        confirmLabel={dangerAction?.kind === "restore" ? "Khôi phục" : dangerAction?.kind === "hard-delete" ? "Xóa vĩnh viễn" : dangerAction?.kind === "delete-media" ? "Xóa ảnh" : "Lưu trữ"}
        description={dangerAction?.kind === "hard-delete" ? "Dữ liệu và toàn bộ ảnh của khuyến mãi sẽ bị xóa vĩnh viễn." : dangerAction?.kind === "restore" ? "Khuyến mãi sẽ quay lại trạng thái trước khi archived." : dangerAction?.kind === "delete-media" ? "Ảnh sẽ bị xóa khỏi gallery." : "Khuyến mãi sẽ chuyển sang archived."}
        open={dangerAction !== null}
        onCancel={() => setDangerAction(null)}
        onConfirm={confirmDangerAction}
        title={dangerAction?.kind === "hard-delete" ? "Xóa vĩnh viễn?" : dangerAction?.kind === "restore" ? "Khôi phục?" : dangerAction?.kind === "delete-media" ? "Xóa ảnh?" : "Lưu trữ?"}
      />
    </div>
  );
}

function PromotionEffectiveness({ items, loading }: { items: InternalPromotion[]; loading: boolean }) {
  if (items.length === 0) {
    return <EmptyState message={loading ? "Đang tải hiệu quả khuyến mãi..." : "Chưa có khuyến mãi để đánh giá."} />;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {items.map((promotion) => {
        const usageRate = promotion.usageLimit > 0 ? promotion.usedCount / promotion.usageLimit : 0;
        const revenueImpact = Number(promotion.revenueImpact);
        const good = usageRate >= 0.3 || revenueImpact > 0 || promotion.customerSegment === "vip";

        return (
          <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-black" key={promotion.promotionId}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold">{promotion.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{promotion.code} - {promotion.customerSegment}/{promotion.customerTier}</p>
              </div>
              <StatusPill value={good ? "good" : "needs_review"} />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Metric label="Usage" value={`${promotion.usedCount}/${promotion.usageLimit}`} />
              <Metric label="Revenue" value={Number(promotion.revenueImpact).toLocaleString("vi-VN")} />
              <Metric label="VIP priority" value={`${promotion.vipDiscountPriority}%`} />
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-neutral-400 md:grid-cols-2">
              <p>Quà thường: {promotion.regularGiftTitle || "Chưa cấu hình"}</p>
              <p>Quà VIP: {promotion.vipGiftTitle || "Chưa cấu hình"}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function TextInput({ error, label, onChange, type = "text", value }: { error?: string; label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <input className={`h-11 w-full rounded-xl border bg-white px-3 text-sm outline-none dark:bg-black ${error ? "border-rose-300" : "border-slate-200 dark:border-neutral-800"}`} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <p className="text-xs font-medium text-rose-600 dark:text-rose-300">{error}</p> : null}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function PromotionCards({
  archived = false,
  empty,
  hardPending,
  items,
  onArchive,
  onEdit,
  onHardDelete,
  onMedia,
  onRestore,
}: {
  archived?: boolean;
  empty: string;
  hardPending: boolean;
  items: InternalPromotion[];
  onArchive?: (promotion: InternalPromotion) => void;
  onEdit?: (promotion: InternalPromotion) => void;
  onHardDelete: (promotion: InternalPromotion) => void;
  onMedia?: (promotion: InternalPromotion) => void;
  onRestore?: (promotion: InternalPromotion) => void;
}) {
  if (items.length === 0) return <div className="mt-4"><EmptyState message={empty} /></div>;

  return (
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      {items.map((promotion) => (
        <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-neutral-800 dark:bg-black" key={promotion.promotionId}>
          <div className="flex gap-3">
            <Thumb alt={promotion.title} thumbnailUrl={promotion.thumbnailUrl} />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{promotion.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{promotion.code} - {promotion.discountValue} {promotion.discountType}</p>
                </div>
                <StatusPill value={promotion.status} />
              </div>
              <p className="line-clamp-2 text-sm text-slate-600 dark:text-neutral-400">{promotion.description || "Không có mô tả."}</p>
              <div className="flex flex-wrap gap-2">
                {archived ? (
                  <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 px-3 text-xs font-semibold text-emerald-700 disabled:opacity-70" onClick={() => onRestore?.(promotion)} type="button">
                    <FiRefreshCw size={14} />
                    Restore
                  </button>
                ) : (
                  <>
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-neutral-800" onClick={() => onEdit?.(promotion)} type="button">
                      <FiEdit2 size={14} />
                      Sửa
                    </button>
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold dark:border-neutral-800" onClick={() => onMedia?.(promotion)} type="button">
                      <FiImage size={14} />
                      Ảnh
                    </button>
                    <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-amber-200 px-3 text-xs font-semibold text-amber-700" onClick={() => onArchive?.(promotion)} type="button">
                      <FiTrash2 size={14} />
                      Soft delete
                    </button>
                  </>
                )}
                <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 disabled:opacity-70" disabled={hardPending} onClick={() => onHardDelete(promotion)} type="button">
                  <FiTrash2 size={14} />
                  Hard delete
                </button>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
