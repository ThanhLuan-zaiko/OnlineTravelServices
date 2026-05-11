"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FiActivity, FiSearch } from "react-icons/fi";

import { getInternalAuditPage } from "@/lib/client/api-client";

import { EmptyState, InternalPanel, InternalPageHeader, StatusPill } from "./internal-primitives";

export function AuditManager() {
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [submittedFilter, setSubmittedFilter] = useState<{ entityId?: string; entityType?: string }>({});
  const auditQuery = useQuery({
    queryKey: ["internal", "audit", submittedFilter] as const,
    queryFn: () => getInternalAuditPage({ limit: 50, ...submittedFilter }),
  });
  const audits = auditQuery.data?.audits ?? [];

  return (
    <div className="space-y-5">
      <InternalPageHeader
        description="Xem nhật ký thao tác theo tài khoản hiện tại hoặc lọc theo entity khi cần kiểm tra thay đổi."
        title="Audit log"
      />
      <InternalPanel className="p-4">
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedFilter(entityType && entityId ? { entityId, entityType } : {});
          }}
        >
          <TextInput label="Entity type" value={entityType} onChange={setEntityType} />
          <TextInput label="Entity ID" value={entityId} onChange={setEntityId} />
          <button className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white dark:bg-neutral-50 dark:text-neutral-950" type="submit">
            <FiSearch size={16} />
            Lọc
          </button>
        </form>
        <div className="mt-4 space-y-3">
          {audits.length === 0 ? (
            <EmptyState message={auditQuery.isLoading ? "Đang tải audit log..." : "Chưa có audit log phù hợp."} />
          ) : (
            audits.map((audit) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-black" key={audit.auditId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 dark:border-neutral-800">
                      <FiActivity size={17} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{audit.description}</h3>
                      <p className="mt-1 text-sm text-slate-500">{audit.entityType} {audit.entityId ? `- ${audit.entityId}` : ""}</p>
                      <p className="mt-1 text-xs text-slate-400">{audit.actorRole} - {audit.actorId}</p>
                    </div>
                  </div>
                  <StatusPill value={audit.action} />
                </div>
              </article>
            ))
          )}
        </div>
      </InternalPanel>
    </div>
  );
}

function TextInput({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <input className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none dark:border-neutral-800 dark:bg-black" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
