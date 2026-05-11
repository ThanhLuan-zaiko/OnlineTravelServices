import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type {
  InternalTourApproval,
  TourApprovalDecisionRequest,
  TourApprovalMutationRequest,
} from "@/lib/shared/internal";

type TourApprovalStatus = "approved" | "change_requested" | "pending" | "rejected";

type TourApprovalRow = {
  approval_id: string;
  change_request_detail: string | null;
  request_note: string | null;
  requested_at: unknown;
  requested_by: string | null;
  requested_by_name: string | null;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  review_note: string | null;
  risk_flags: string[] | null;
  status: TourApprovalStatus;
  tour_id: string;
  tour_title: string;
};

function toTourApproval(row: TourApprovalRow): InternalTourApproval {
  return {
    approvalId: String(row.approval_id),
    changeRequestDetail: row.change_request_detail,
    requestNote: row.request_note,
    requestedAt: String(row.requested_at),
    requestedBy: row.requested_by ? String(row.requested_by) : null,
    requestedByName: row.requested_by_name,
    reviewedAt: row.reviewed_at ? row.reviewed_at.toISOString() : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewNote: row.review_note,
    riskFlags: row.risk_flags ?? [],
    status: row.status,
    tourId: String(row.tour_id),
    tourTitle: row.tour_title,
  };
}

function approvalColumns() {
  return `approval_id, status, requested_at, tour_id, tour_title, requested_by, requested_by_name,
          request_note, risk_flags, reviewed_by, review_note, reviewed_at, change_request_detail`;
}

async function writeApprovalProjections(approval: InternalTourApproval) {
  const params = [
    approval.status,
    approval.requestedAt,
    approval.approvalId,
    approval.tourId,
    approval.tourTitle,
    approval.requestedBy ?? null,
    approval.requestedByName ?? null,
    approval.requestNote ?? null,
    approval.riskFlags,
    approval.reviewedBy ?? null,
    approval.reviewNote ?? null,
    approval.reviewedAt ? new Date(approval.reviewedAt) : null,
    approval.changeRequestDetail ?? null,
  ];

  await Promise.all([
    executeQuery(
      `INSERT INTO tour_approval_requests
        (status, requested_at, approval_id, tour_id, tour_title, requested_by, requested_by_name,
         request_note, risk_flags, reviewed_by, review_note, reviewed_at, change_request_detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params,
    ),
    executeQuery(
      `INSERT INTO tour_approval_requests_by_tour
        (status, requested_at, approval_id, tour_id, tour_title, requested_by, requested_by_name,
         request_note, risk_flags, reviewed_by, review_note, reviewed_at, change_request_detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params,
    ),
  ]);
}

export async function findTourApproval(approvalId: string) {
  const rows = await executeQuery<TourApprovalRow>(
    `SELECT ${approvalColumns()}
     FROM tour_approval_requests_by_id
     WHERE approval_id = ?`,
    [approvalId],
  );

  return rows[0] ? toTourApproval(rows[0]) : null;
}

export async function listTourApprovalsPage(
  status: TourApprovalStatus,
  options?: {
    cursor?: string | null;
    limit?: number;
    query?: string;
  },
) {
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 80);
  const query = options?.query?.trim().toLowerCase();
  const page = await executePagedQuery<{ approval_id: string }>(
    "SELECT approval_id FROM tour_approval_requests WHERE status = ?",
    [status],
    {
      fetchSize: query ? Math.min(limit * 3, 120) : limit,
      pageState: options?.cursor ?? null,
    },
  );
  const approvals = (await Promise.all(page.rows.map((row) => findTourApproval(String(row.approval_id)))))
    .filter((item): item is InternalTourApproval => Boolean(item))
    .filter((item) => item.status === status)
    .filter((item) => {
      if (!query) return true;
      return [item.tourTitle, item.tourId, item.approvalId, item.requestedByName ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      );
    })
    .slice(0, limit);

  return {
    approvals,
    nextCursor: page.pageState ? String(page.pageState) : null,
  };
}

export async function createTourApproval(input: TourApprovalMutationRequest, actorUserId: string) {
  const approvalId = String(uuidv7());
  const requestedAt = String(types.TimeUuid.now());

  await executeQuery(
    `INSERT INTO tour_approval_requests_by_id
      (approval_id, status, requested_at, tour_id, tour_title, requested_by, requested_by_name,
       request_note, risk_flags, reviewed_by, review_note, reviewed_at, change_request_detail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      approvalId,
      "pending",
      requestedAt,
      input.tourId,
      input.tourTitle,
      actorUserId,
      input.requestedByName ?? null,
      input.requestNote ?? null,
      input.riskFlags,
      null,
      null,
      null,
      null,
    ],
  );

  const approval = await findTourApproval(approvalId);

  if (approval) {
    await writeApprovalProjections(approval);
  }

  return approval;
}

export async function decideTourApproval(
  approvalId: string,
  input: TourApprovalDecisionRequest,
  actorUserId: string,
) {
  const existing = await findTourApproval(approvalId);

  if (!existing) {
    return null;
  }

  const reviewedAt = new Date();

  await executeQuery(
    `UPDATE tour_approval_requests_by_id
     SET status = ?, reviewed_by = ?, review_note = ?, reviewed_at = ?, change_request_detail = ?
     WHERE approval_id = ?`,
    [
      input.decision,
      actorUserId,
      input.reviewNote,
      reviewedAt,
      input.changeRequestDetail ?? null,
      approvalId,
    ],
  );

  const updated = await findTourApproval(approvalId);

  if (updated) {
    await writeApprovalProjections(updated);
  }

  return updated;
}
