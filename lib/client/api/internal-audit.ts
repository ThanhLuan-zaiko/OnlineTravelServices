import type { InternalAuditEvent } from "@/lib/shared/internal";

import { apiClient } from "./core";

export async function getInternalAuditPage(input?: {
  cursor?: string | null;
  entityId?: string;
  entityType?: string;
  limit?: number;
}) {
  const response = await apiClient.get<{ audits: InternalAuditEvent[]; nextCursor: string | null }>("/internal/audit", {
    params: {
      cursor: input?.cursor ?? undefined,
      entityId: input?.entityId,
      entityType: input?.entityType,
      limit: input?.limit,
    },
  });

  return response.data;
}
