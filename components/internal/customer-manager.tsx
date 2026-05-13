"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FiGift, FiList, FiLock, FiMessageSquare, FiSave, FiShield, FiStar, FiUsers } from "react-icons/fi";

import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import {
  addInternalCustomerReward,
  getInternalCustomerHistory,
  getInternalCustomerPage,
  getInternalCustomerRewards,
  updateInternalCustomerTier,
  type ApiError,
} from "@/lib/client/api-client";
import type {
  CustomerRewardMutationRequest,
  CustomerTierMutationRequest,
  InternalCustomerProfile,
} from "@/lib/shared/internal";

import { InlineSelect, ListFilters, WorkspaceTabs } from "./catalog-workspace-ui";
import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

type CustomerTab = "feedback" | "list" | "rewards" | "security" | "segments" | "violations" | "vip";

const tabs = [
  { href: "/internal/customers/list", icon: FiList, label: "Danh sách" },
  { href: "/internal/customers/vip", icon: FiStar, label: "VIP" },
  { href: "/internal/customers/feedback", icon: FiMessageSquare, label: "Phản hồi" },
  { href: "/internal/customers/rewards", icon: FiGift, label: "Quà tặng" },
  { href: "/internal/customers/security", icon: FiLock, label: "Bảo mật" },
];

const adminOnlyTabs = [
  { href: "/internal/customers/violations", icon: FiShield, label: "Vi phạm" },
  { href: "/internal/customers/segments", icon: FiUsers, label: "Phân khúc" },
];

const customerTierOptions = [
  { label: "standard", value: "standard" },
  { label: "silver", value: "silver" },
  { label: "gold", value: "gold" },
  { label: "platinum", value: "platinum" },
];

const vipTierOptions = [
  { label: "none", value: "none" },
  { label: "silver", value: "silver" },
  { label: "gold", value: "gold" },
  { label: "diamond", value: "diamond" },
];

const initialReward: CustomerRewardMutationRequest = {
  description: "",
  expiresAt: null,
  pointsDelta: 0,
  promotionId: null,
  rewardType: "gift",
  title: "",
};

function getTab(pathname: string, basePath: string): CustomerTab {
  if (pathname.startsWith(`${basePath}/vip`)) return "vip";
  if (pathname.startsWith(`${basePath}/feedback`)) return "feedback";
  if (pathname.startsWith(`${basePath}/rewards`)) return "rewards";
  if (pathname.startsWith(`${basePath}/security`)) return "security";
  if (pathname.startsWith(`${basePath}/violations`)) return "violations";
  if (pathname.startsWith(`${basePath}/segments`)) return "segments";
  return "list";
}

function money(value: string) {
  return `${Number(value).toLocaleString("vi-VN")} đ`;
}

export function CustomerManager({ basePath = "/internal/customers" }: { basePath?: string }) {
  const pathname = usePathname();
  const activeTab = getTab(pathname, basePath);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<InternalCustomerProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pageSize, setPageSize] = useState(12);
  const [vipTier, setVipTier] = useState("gold");
  const [tierForm, setTierForm] = useState<CustomerTierMutationRequest>({ customerTier: "standard", vipTier: "none" });
  const [rewardForm, setRewardForm] = useState<CustomerRewardMutationRequest>(initialReward);

  const mode = activeTab === "vip" ? "vip" : "status";
  const value = activeTab === "vip" ? vipTier : "active";
  const listQuery = useQuery({
    queryKey: ["internal", "customers", mode, value, searchQuery, pageSize] as const,
    queryFn: () => getInternalCustomerPage({ limit: pageSize, mode, q: searchQuery, value }),
  });
  const historyQuery = useQuery({
    enabled: Boolean(selectedCustomer),
    queryKey: ["internal", "customers", selectedCustomer?.userId, "history"] as const,
    queryFn: () => getInternalCustomerHistory(selectedCustomer?.userId ?? ""),
  });
  const rewardsQuery = useQuery({
    enabled: Boolean(selectedCustomer),
    queryKey: ["internal", "customers", selectedCustomer?.userId, "rewards"] as const,
    queryFn: () => getInternalCustomerRewards(selectedCustomer?.userId ?? ""),
  });

  const selectCustomer = (customer: InternalCustomerProfile) => {
    setSelectedCustomer(customer);
    setTierForm({ customerTier: customer.customerTier, vipTier: customer.vipTier });
  };

  const tierMutation = useMutation({
    mutationFn: () => updateInternalCustomerTier(selectedCustomer?.userId ?? "", tierForm),
    onSuccess: async (response) => {
      setSelectedCustomer(response.customer);
      await queryClient.invalidateQueries({ queryKey: ["internal", "customers"] });
      showToast({ title: "Đã cập nhật phân loại", message: "Thông tin khách hàng đã được đồng bộ.", variant: "success" });
    },
    onError: (error) => showToast({ title: "Không thể cập nhật", message: (error as ApiError).message, variant: "error" }),
  });

  const rewardMutation = useMutation({
    mutationFn: () => addInternalCustomerReward(selectedCustomer?.userId ?? "", rewardForm),
    onSuccess: async () => {
      setRewardForm(initialReward);
      await queryClient.invalidateQueries({ queryKey: ["internal", "customers", selectedCustomer?.userId, "rewards"] });
      await queryClient.invalidateQueries({ queryKey: ["internal", "customers", selectedCustomer?.userId, "history"] });
      showToast({ title: "Đã gán quà tặng", message: "Reward đã được ghi vào lịch sử khách hàng.", variant: "success" });
    },
    onError: (error) => showToast({ title: "Không thể gán quà", message: (error as ApiError).message, variant: "error" }),
  });

  const submitReward = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCustomer) {
      showToast({ title: "Chưa chọn khách hàng", message: "Chọn khách hàng trước khi gán reward.", variant: "error" });
      return;
    }

    rewardMutation.mutate();
  };

  const customers = listQuery.data?.customers ?? [];
  const rewards = rewardsQuery.data?.rewards ?? [];
  const history = historyQuery.data?.history ?? [];

  return (
    <div className="space-y-5">
      <InternalPageHeader
        description="Xem hồ sơ khách hàng, phân loại thường/VIP, theo dõi lịch sử, gán quà tặng và kiểm tra thông tin bảo mật."
        title="Khách hàng"
      />
      <WorkspaceTabs
        pathname={pathname}
        tabs={(basePath.startsWith("/internal/admin") ? [...tabs, ...adminOnlyTabs] : tabs).map((tab) => ({
          ...tab,
          href: tab.href.replace("/internal/customers", basePath),
        }))}
      />

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <InternalPanel className="p-4">
          <ListFilters pageSize={pageSize} searchQuery={searchQuery} setPageSize={setPageSize} setSearchQuery={setSearchQuery}>
            {activeTab === "vip" ? (
              <InlineSelect label="VIP tier" name="customer-vip-tier" onChange={setVipTier} options={vipTierOptions} value={vipTier} />
            ) : (
              <InlineSelect label="Trạng thái" name="customer-status" onChange={() => undefined} options={[{ label: "active", value: "active" }]} value="active" />
            )}
          </ListFilters>
          <div className="mt-4 space-y-3">
            {customers.length === 0 ? (
              <EmptyState message={listQuery.isLoading ? "Đang tải khách hàng..." : "Không tìm thấy khách hàng phù hợp."} />
            ) : (
              customers.map((customer) => (
                <button
                  className={`w-full rounded-2xl border p-4 text-left transition ${selectedCustomer?.userId === customer.userId ? "border-sky-300 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30" : "border-slate-200 bg-white hover:bg-slate-50 dark:border-neutral-800 dark:bg-black dark:hover:bg-neutral-900"}`}
                  key={customer.userId}
                  onClick={() => selectCustomer(customer)}
                  type="button"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{customer.fullName}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">{customer.email}</p>
                    </div>
                    <StatusPill value={customer.vipTier === "none" ? customer.customerTier : `vip-${customer.vipTier}`} />
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-3">
                    <span>{customer.totalBookings} booking</span>
                    <span>{money(customer.totalSpent)}</span>
                    <span>{customer.violationCount} vi phạm</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </InternalPanel>

        <div className="space-y-5">
          {!selectedCustomer ? (
            <InternalPanel className="p-4">
              <EmptyState message="Chọn một khách hàng để xem chi tiết." />
            </InternalPanel>
          ) : (
            <>
              <InternalPanel className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedCustomer.fullName}</h3>
                    <p className="mt-1 text-sm text-slate-500">{selectedCustomer.phone} - {selectedCustomer.email}</p>
                  </div>
                  <StatusPill value={selectedCustomer.status} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Metric label="Loyalty" value={String(selectedCustomer.loyaltyPoints)} />
                  <Metric label="Booking" value={String(selectedCustomer.totalBookings)} />
                  <Metric label="Chi tiêu" value={money(selectedCustomer.totalSpent)} />
                </div>
              </InternalPanel>

              {(activeTab === "list" || activeTab === "vip" || activeTab === "segments") ? (
                <InternalPanel className="p-4">
                  <h3 className="text-base font-semibold">Phân loại khách hàng</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <SelectField label="Customer tier" name="customer-tier" onValueChange={(value) => setTierForm((current) => ({ ...current, customerTier: value }))} options={customerTierOptions} placeholder="Tier" value={tierForm.customerTier} />
                    <SelectField label="VIP tier" name="customer-vip" onValueChange={(value) => setTierForm((current) => ({ ...current, vipTier: value }))} options={vipTierOptions} placeholder="VIP" value={tierForm.vipTier} />
                  </div>
                  <button className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950" disabled={tierMutation.isPending} onClick={() => tierMutation.mutate()} type="button">
                    <FiSave size={16} />
                    Lưu phân loại
                  </button>
                </InternalPanel>
              ) : null}

              {activeTab === "rewards" ? (
                <InternalPanel className="p-4">
                  <h3 className="text-base font-semibold">Gán quà tặng/khuyến mãi</h3>
                  <form className="mt-4 grid gap-4" onSubmit={submitReward}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <TextInput label="Tên quà" value={rewardForm.title} onChange={(value) => setRewardForm((current) => ({ ...current, title: value }))} />
                      <TextInput label="Loại" value={rewardForm.rewardType} onChange={(value) => setRewardForm((current) => ({ ...current, rewardType: value }))} />
                      <TextInput label="Điểm thưởng" type="number" value={String(rewardForm.pointsDelta)} onChange={(value) => setRewardForm((current) => ({ ...current, pointsDelta: Number(value) }))} />
                      <TextInput label="Hết hạn" type="datetime-local" value={rewardForm.expiresAt ?? ""} onChange={(value) => setRewardForm((current) => ({ ...current, expiresAt: value || null }))} />
                      <TextInput label="Promotion ID" value={rewardForm.promotionId ?? ""} onChange={(value) => setRewardForm((current) => ({ ...current, promotionId: value || null }))} />
                    </div>
                    <Textarea label="Mô tả" value={rewardForm.description ?? ""} onChange={(value) => setRewardForm((current) => ({ ...current, description: value || null }))} />
                    <button className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-70 dark:bg-neutral-50 dark:text-neutral-950" disabled={rewardMutation.isPending} type="submit">
                      <FiGift size={16} />
                      Gán reward
                    </button>
                  </form>
                </InternalPanel>
              ) : null}

              <InternalPanel className="p-4">
                <h3 className="text-base font-semibold">{activeTab === "rewards" ? "Reward gần đây" : "Lịch sử và phản hồi"}</h3>
                <div className="mt-4 space-y-3">
                  {(activeTab === "rewards" ? rewards : history).length === 0 ? (
                    <EmptyState message={activeTab === "rewards" ? "Chưa có reward." : "Chưa có lịch sử."} />
                  ) : activeTab === "rewards" ? (
                    rewards.map((reward) => (
                      <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={reward.rewardTime}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-semibold">{reward.title}</p>
                          <StatusPill value={reward.status} />
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{reward.rewardType} - {reward.pointsDelta} điểm</p>
                      </div>
                    ))
                  ) : (
                    history.map((item) => (
                      <div className="rounded-xl border border-slate-200 p-3 dark:border-neutral-800" key={item.eventTime}>
                        <p className="font-semibold">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.eventType} - {item.detail ?? "Không có chi tiết."}</p>
                      </div>
                    ))
                  )}
                </div>
              </InternalPanel>

              {activeTab === "security" || activeTab === "violations" ? (
                <InternalPanel className="p-4">
                  <div className="flex items-center gap-2">
                    <FiShield className="text-slate-400" size={16} />
                    <h3 className="text-base font-semibold">{activeTab === "violations" ? "Xử lý vi phạm" : "Bảo mật thông tin"}</h3>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Metric label="User ID" value={selectedCustomer.userId} />
                    <Metric label="Vi phạm" value={String(selectedCustomer.violationCount)} />
                  </div>
                </InternalPanel>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TextInput({ label, onChange, type = "text", value }: { label: string; onChange: (value: string) => void; type?: string; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-neutral-800 dark:bg-black" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Textarea({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <textarea className="min-h-24 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-neutral-800 dark:bg-black" onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-neutral-800">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-950 dark:text-neutral-50">{value}</p>
    </div>
  );
}
