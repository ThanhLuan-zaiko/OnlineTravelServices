import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { createInternalTour } from "@/lib/server/internal-data/tours";
import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import {
  vehicleCatalogOptions,
  type InternalSuggestedTour,
  type SuggestedTourDecisionRequest,
  type SuggestedTourMutationRequest,
  type TourMutationRequest,
} from "@/lib/shared/internal";

import { decimal, decimalToString } from "./shared";

type SuggestedTourStatus = "approved" | "converted" | "pending" | "rejected";

type SuggestedTourRow = {
  alternative_suggestion: string | null;
  budget_amount: unknown;
  converted_tour_id: string | null;
  created_at: unknown;
  currency: string;
  decision_at: Date | null;
  decision_by: string | null;
  decision_note: string | null;
  destination_id: string | null;
  destination_name: string;
  estimated_guests: number;
  feasibility_issues: string[] | null;
  feasibility_score: number;
  itinerary_summary: string;
  proposed_by: string | null;
  proposed_by_name: string | null;
  proposed_end_date: types.LocalDate | string | null;
  proposed_start_date: types.LocalDate | string | null;
  safety_level: string;
  service_summary: string;
  source_type: string;
  status: SuggestedTourStatus;
  suggestion_id: string;
  title: string;
};

function localDateToNullableString(value: types.LocalDate | string | null) {
  return value ? String(value) : null;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "suggested-tour";
}

function estimateDurationDays(suggestion: InternalSuggestedTour) {
  if (!suggestion.proposedStartDate || !suggestion.proposedEndDate) {
    return 1;
  }

  const start = Date.parse(suggestion.proposedStartDate);
  const end = Date.parse(suggestion.proposedEndDate);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return 1;
  }

  return Math.max(1, Math.round((end - start) / 86_400_000) + 1);
}

function toSuggestedTour(row: SuggestedTourRow): InternalSuggestedTour {
  return {
    alternativeSuggestion: row.alternative_suggestion,
    budgetAmount: decimalToString(row.budget_amount),
    convertedTourId: row.converted_tour_id ? String(row.converted_tour_id) : null,
    createdAt: String(row.created_at),
    currency: row.currency,
    decisionAt: row.decision_at ? row.decision_at.toISOString() : null,
    decisionBy: row.decision_by ? String(row.decision_by) : null,
    decisionNote: row.decision_note,
    destinationId: row.destination_id ? String(row.destination_id) : null,
    destinationName: row.destination_name,
    estimatedGuests: row.estimated_guests,
    feasibilityIssues: row.feasibility_issues ?? [],
    feasibilityScore: row.feasibility_score,
    itinerarySummary: row.itinerary_summary,
    proposedBy: row.proposed_by ? String(row.proposed_by) : null,
    proposedByName: row.proposed_by_name,
    proposedEndDate: localDateToNullableString(row.proposed_end_date),
    proposedStartDate: localDateToNullableString(row.proposed_start_date),
    safetyLevel: row.safety_level,
    serviceSummary: row.service_summary,
    sourceType: row.source_type,
    status: row.status,
    suggestionId: String(row.suggestion_id),
    title: row.title,
  };
}

function suggestedTourColumns() {
  return `suggestion_id, status, created_at, source_type, title, destination_id, destination_name, proposed_by,
          proposed_by_name, budget_amount, currency, estimated_guests, proposed_start_date, proposed_end_date,
          itinerary_summary, service_summary, safety_level, feasibility_score, feasibility_issues, decision_by,
          decision_at, decision_note, alternative_suggestion, converted_tour_id`;
}

async function writeSuggestedTourProjection(suggestion: InternalSuggestedTour) {
  await executeQuery(
    `INSERT INTO suggested_tours_by_status
      (status, created_at, suggestion_id, source_type, title, destination_id, destination_name, proposed_by,
       proposed_by_name, budget_amount, currency, estimated_guests, proposed_start_date, proposed_end_date,
       itinerary_summary, service_summary, safety_level, feasibility_score, feasibility_issues, decision_by,
       decision_at, decision_note, alternative_suggestion, converted_tour_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      suggestion.status,
      suggestion.createdAt,
      suggestion.suggestionId,
      suggestion.sourceType,
      suggestion.title,
      suggestion.destinationId,
      suggestion.destinationName,
      suggestion.proposedBy ?? null,
      suggestion.proposedByName ?? null,
      decimal(suggestion.budgetAmount),
      suggestion.currency,
      suggestion.estimatedGuests,
      suggestion.proposedStartDate ? types.LocalDate.fromString(suggestion.proposedStartDate) : null,
      suggestion.proposedEndDate ? types.LocalDate.fromString(suggestion.proposedEndDate) : null,
      suggestion.itinerarySummary,
      suggestion.serviceSummary,
      suggestion.safetyLevel,
      suggestion.feasibilityScore,
      suggestion.feasibilityIssues,
      suggestion.decisionBy ?? null,
      suggestion.decisionAt ? new Date(suggestion.decisionAt) : null,
      suggestion.decisionNote ?? null,
      suggestion.alternativeSuggestion ?? null,
      suggestion.convertedTourId ?? null,
    ],
  );
}

export async function findSuggestedTour(suggestionId: string) {
  const rows = await executeQuery<SuggestedTourRow>(
    `SELECT ${suggestedTourColumns()}
     FROM suggested_tours_by_id
     WHERE suggestion_id = ?`,
    [suggestionId],
  );

  return rows[0] ? toSuggestedTour(rows[0]) : null;
}

export async function listSuggestedToursPage(
  status: SuggestedTourStatus,
  options?: {
    cursor?: string | null;
    limit?: number;
    query?: string;
  },
) {
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 80);
  const query = options?.query?.trim().toLowerCase();
  const page = await executePagedQuery<{ suggestion_id: string }>(
    "SELECT suggestion_id FROM suggested_tours_by_status WHERE status = ?",
    [status],
    {
      fetchSize: query ? Math.min(limit * 3, 120) : limit,
      pageState: options?.cursor ?? null,
    },
  );
  const suggestions = (await Promise.all(page.rows.map((row) => findSuggestedTour(String(row.suggestion_id)))))
    .filter((item): item is InternalSuggestedTour => Boolean(item))
    .filter((item) => item.status === status)
    .filter((item) => {
      if (!query) return true;
      return [item.title, item.destinationName, item.sourceType, item.safetyLevel, item.suggestionId].some((value) =>
        value.toLowerCase().includes(query),
      );
    })
    .slice(0, limit);

  return {
    nextCursor: page.pageState ? String(page.pageState) : null,
    suggestions,
  };
}

export async function createSuggestedTour(input: SuggestedTourMutationRequest) {
  const suggestionId = String(uuidv7());
  const createdAt = String(types.TimeUuid.now());

  await executeQuery(
    `INSERT INTO suggested_tours_by_id
      (suggestion_id, status, created_at, source_type, title, destination_id, destination_name, proposed_by,
       proposed_by_name, budget_amount, currency, estimated_guests, proposed_start_date, proposed_end_date,
       itinerary_summary, service_summary, safety_level, feasibility_score, feasibility_issues, decision_by,
       decision_at, decision_note, alternative_suggestion, converted_tour_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      suggestionId,
      input.status,
      createdAt,
      input.sourceType,
      input.title,
      input.destinationId ?? null,
      input.destinationName,
      input.proposedBy ?? null,
      input.proposedByName ?? null,
      decimal(input.budgetAmount),
      input.currency,
      input.estimatedGuests,
      input.proposedStartDate ? types.LocalDate.fromString(input.proposedStartDate) : null,
      input.proposedEndDate ? types.LocalDate.fromString(input.proposedEndDate) : null,
      input.itinerarySummary,
      input.serviceSummary,
      input.safetyLevel,
      input.feasibilityScore,
      input.feasibilityIssues,
      null,
      null,
      null,
      null,
      null,
    ],
  );

  const suggestion = await findSuggestedTour(suggestionId);

  if (suggestion) {
    await writeSuggestedTourProjection(suggestion);
  }

  return suggestion;
}

export async function updateSuggestedTour(suggestionId: string, input: SuggestedTourMutationRequest) {
  const existing = await findSuggestedTour(suggestionId);

  if (!existing) {
    return null;
  }

  await executeQuery(
    `UPDATE suggested_tours_by_id
     SET status = ?, source_type = ?, title = ?, destination_id = ?, destination_name = ?, proposed_by = ?,
         proposed_by_name = ?, budget_amount = ?, currency = ?, estimated_guests = ?, proposed_start_date = ?,
         proposed_end_date = ?, itinerary_summary = ?, service_summary = ?, safety_level = ?,
         feasibility_score = ?, feasibility_issues = ?
     WHERE suggestion_id = ?`,
    [
      input.status,
      input.sourceType,
      input.title,
      input.destinationId ?? null,
      input.destinationName,
      input.proposedBy ?? null,
      input.proposedByName ?? null,
      decimal(input.budgetAmount),
      input.currency,
      input.estimatedGuests,
      input.proposedStartDate ? types.LocalDate.fromString(input.proposedStartDate) : null,
      input.proposedEndDate ? types.LocalDate.fromString(input.proposedEndDate) : null,
      input.itinerarySummary,
      input.serviceSummary,
      input.safetyLevel,
      input.feasibilityScore,
      input.feasibilityIssues,
      suggestionId,
    ],
  );

  const updated = await findSuggestedTour(suggestionId);

  if (updated) {
    await writeSuggestedTourProjection(updated);
  }

  return updated;
}

export async function decideSuggestedTour(
  suggestionId: string,
  input: SuggestedTourDecisionRequest,
  actorUserId: string,
) {
  const existing = await findSuggestedTour(suggestionId);

  if (!existing) {
    return null;
  }

  let convertedTourId: string | null = existing.convertedTourId;
  const nextStatus = input.decision;

  if (input.decision === "converted" && !convertedTourId) {
    if (!existing.destinationId) {
      throw new Error("Tour đề xuất cần Destination ID trước khi chuyển thành tour.");
    }

    const vehicle = vehicleCatalogOptions[0];
    const durationDays = estimateDurationDays(existing);
    const tourInput: TourMutationRequest = {
      basePrice: existing.budgetAmount,
      category: "Tour đề xuất",
      currency: existing.currency,
      destinationId: existing.destinationId,
      destinationName: existing.destinationName,
      durationDays,
      durationNights: Math.max(durationDays - 1, 0),
      excludedServices: [],
      includedServices: [existing.serviceSummary],
      maxGuests: existing.estimatedGuests,
      minGuests: 1,
      slug: `${slugify(existing.title)}-${suggestionId.slice(0, 8)}`,
      status: input.publishConvertedTour ? "published" : "draft",
      summary: existing.itinerarySummary,
      title: existing.title,
      tourType: "suggested",
      vehicleCapacity: vehicle.vehicleCapacity,
      vehicleCatalogId: vehicle.id,
      vehicleCatalogLabel: vehicle.label,
      vehicleModel: vehicle.vehicleModel,
      vehicleType: vehicle.vehicleType,
      vipOnly: false,
    };
    const tour = await createInternalTour(tourInput, actorUserId);

    convertedTourId = tour?.tourId ?? null;
  }

  const decidedAt = new Date();

  await executeQuery(
    `UPDATE suggested_tours_by_id
     SET status = ?, decision_by = ?, decision_at = ?, decision_note = ?, alternative_suggestion = ?, converted_tour_id = ?
     WHERE suggestion_id = ?`,
    [
      nextStatus,
      actorUserId,
      decidedAt,
      input.decisionNote,
      input.alternativeSuggestion ?? null,
      convertedTourId,
      suggestionId,
    ],
  );

  const updated = await findSuggestedTour(suggestionId);

  if (updated) {
    await writeSuggestedTourProjection(updated);
  }

  return updated;
}
