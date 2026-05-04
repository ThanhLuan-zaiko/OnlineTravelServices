"use client";

import type { DestinationMutationRequest, InternalDestination } from "@/lib/shared/internal";
import type { MapLocationSelection } from "./map-location-picker";

export type DraftCreationError = {
  details?: string;
  message: string;
};

export function splitLines(value: string) {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function joinKeywords(value: string[]) {
  return value.join("\n");
}

export function toValidationErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.reduce<Partial<Record<keyof DestinationMutationRequest, string>> & { searchKeywords?: string }>(
    (accumulator, issue) => {
      const key = issue.path[0];

      if (key === "searchKeywords") {
        accumulator.searchKeywords = issue.message;
      } else if (typeof key === "string") {
        accumulator[key as keyof DestinationMutationRequest] = issue.message;
      }

      return accumulator;
    },
    {},
  );
}

export function buildFormFromDestination(destination: InternalDestination): DestinationMutationRequest {
  return {
    address: destination.address ?? "",
    category: destination.category,
    city: destination.city,
    country: destination.country,
    coverImageUrl: destination.coverImageUrl ?? "",
    description: destination.description ?? "",
    latitude: destination.latitude,
    longitude: destination.longitude,
    name: destination.name,
    popularityScore: destination.popularityScore,
    region: destination.region,
    safetyLevel: destination.safetyLevel,
    searchKeywords: destination.searchKeywords,
    status: destination.status,
  };
}

export function extractLocationFields(selection: MapLocationSelection, currentName: string) {
  const address = selection.address ?? {};
  const displayParts = selection.displayName
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const city =
    address.city ??
    address.town ??
    address.village ??
    address.municipality ??
    address.county ??
    address.city_district ??
    displayParts.at(-3) ??
    currentName;
  const region =
    address.state ??
    address.region ??
    address.state_district ??
    address.county ??
    address.municipality ??
    address.province ??
    address.city_district ??
    displayParts.at(-2) ??
    city;
  const country = address.country ?? "";
  const derivedName = selection.displayName.split(",")[0]?.trim() ?? currentName;

  return {
    address: selection.displayName,
    city,
    country,
    latitude: selection.latitude,
    longitude: selection.longitude,
    name: currentName.trim().length > 0 ? currentName : derivedName,
    region,
  };
}
