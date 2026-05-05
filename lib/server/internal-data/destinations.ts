import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type { DestinationMutationRequest } from "@/lib/shared/internal";

import {
  toDestination,
  toDestinationMedia,
  type DestinationByIdRow,
  type DestinationMediaRow,
  type DestinationStatusRow,
} from "./shared";

const DESTINATION_STATUSES = ["published", "draft", "archived"] as const;
const DEFAULT_DESTINATION_PAGE_SIZE = 8;
const MAX_DESTINATION_PAGE_SIZE = 48;
const SEARCH_SCAN_MULTIPLIER = 6;

async function writeDestinationStatusProjection(destinationId: string, input: DestinationMutationRequest, actorUserId: string | null) {
  await executeQuery(
    `INSERT INTO destination_status_by_admin
      (status, updated_at, destination_id, name, country, region, updated_by, reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.status,
      String(types.TimeUuid.now()),
      destinationId,
      input.name,
      input.country,
      input.region,
      actorUserId,
      null,
    ],
  );
}

async function getDestinationMediaCount(destinationId: string) {
  const rows = await executeQuery<{ media_id: string }>(
    "SELECT media_id FROM destination_media_by_destination WHERE destination_id = ?",
    [destinationId],
  );

  return rows.length;
}

function clampDestinationPageSize(limit?: number) {
  if (!Number.isFinite(limit) || !limit) {
    return DEFAULT_DESTINATION_PAGE_SIZE;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_DESTINATION_PAGE_SIZE);
}

function destinationMatchesSearch(
  destination: NonNullable<Awaited<ReturnType<typeof findInternalDestination>>>,
  query: string | null | undefined,
) {
  const normalizedQuery = query?.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const searchableText = [
    destination.name,
    destination.country,
    destination.region,
    destination.city,
    destination.category,
    destination.safetyLevel,
    destination.description,
    destination.address,
    ...destination.searchKeywords,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

export async function listInternalDestinations(status?: string) {
  const statuses = status ? [status] : [...DESTINATION_STATUSES];
  const destinationIds = new Set<string>();

  for (const currentStatus of statuses) {
    const rows = await executeQuery<DestinationStatusRow>(
      "SELECT destination_id FROM destination_status_by_admin WHERE status = ? LIMIT 120",
      [currentStatus],
    );

    for (const row of rows) {
      destinationIds.add(String(row.destination_id));
    }
  }

  const destinations = await Promise.all([...destinationIds].map((destinationId) => findInternalDestination(destinationId)));

  return destinations
    .filter((destination): destination is NonNullable<Awaited<ReturnType<typeof findInternalDestination>>> => Boolean(destination))
    .filter((destination) => !status || destination.status === status)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listInternalDestinationsPage(
  status: Exclude<(typeof DESTINATION_STATUSES)[number], "archived"> | "archived",
  options?: {
    cursor?: string | null;
    limit?: number;
    query?: string | null;
  },
) {
  const limit = clampDestinationPageSize(options?.limit);
  const query = options?.query?.trim() ?? "";
  const fetchSize = query ? Math.min(limit * SEARCH_SCAN_MULTIPLIER, MAX_DESTINATION_PAGE_SIZE * SEARCH_SCAN_MULTIPLIER) : limit;
  let pageState: string | Buffer | null | undefined = options?.cursor ?? undefined;
  const destinations: NonNullable<Awaited<ReturnType<typeof findInternalDestination>>>[] = [];
  const seenDestinationIds = new Set<string>();

  do {
    const page: { pageState: string | Buffer | null; rows: DestinationStatusRow[] } = await executePagedQuery<DestinationStatusRow>(
      `SELECT destination_id
       FROM destination_status_by_admin
       WHERE status = ?`,
      [status],
      {
        fetchSize,
        pageState,
      },
    );

    pageState = page.pageState;

    const candidateIds = page.rows
      .map((row) => String(row.destination_id))
      .filter((destinationId) => {
        if (seenDestinationIds.has(destinationId)) {
          return false;
        }

        seenDestinationIds.add(destinationId);
        return true;
      });

    const pageDestinations = (await Promise.all(candidateIds.map((destinationId) => findInternalDestination(destinationId))))
      .filter(
        (destination): destination is NonNullable<Awaited<ReturnType<typeof findInternalDestination>>> => {
          if (!destination) {
            return false;
          }

          return destination.status === status;
        },
      )
      .filter((destination) => destinationMatchesSearch(destination, query));

    destinations.push(...pageDestinations);
  } while (destinations.length < limit && pageState);

  return {
    destinations: destinations.slice(0, limit),
    nextCursor: pageState ? String(pageState) : null,
  };
}

export async function findInternalDestination(destinationId: string) {
  const rows = await executeQuery<DestinationByIdRow>(
    `SELECT destination_id, name, country, region, city, category, status, description, cover_image_url,
            average_rating, safety_level, popularity_score, created_at, updated_at,
            address, latitude, longitude, search_keywords
     FROM destinations_by_id
     WHERE destination_id = ?`,
    [destinationId],
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  return toDestination(row, await getDestinationMediaCount(destinationId));
}

export async function createInternalDestination(input: DestinationMutationRequest, actorUserId: string) {
  const destinationId = String(uuidv7());
  const now = new Date();

  await executeQuery(
    `INSERT INTO destinations_by_id
      (destination_id, name, country, region, city, category, status, description, cover_image_url,
       average_rating, safety_level, popularity_score, created_at, updated_at,
       address, latitude, longitude, search_keywords)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      destinationId,
      input.name,
      input.country,
      input.region,
      input.city,
      input.category,
      input.status,
      input.description ?? null,
      input.coverImageUrl ?? null,
      0,
      input.safetyLevel,
      input.popularityScore,
      now,
      now,
      input.address ?? null,
      input.latitude,
      input.longitude,
      input.searchKeywords,
    ],
  );

  await writeDestinationStatusProjection(destinationId, input, actorUserId);

  return findInternalDestination(destinationId);
}

export async function updateInternalDestination(destinationId: string, input: DestinationMutationRequest, actorUserId: string) {
  const existing = await findInternalDestination(destinationId);

  if (!existing) {
    return null;
  }

  const now = new Date();

  await executeQuery(
    `UPDATE destinations_by_id
     SET name = ?, country = ?, region = ?, city = ?, category = ?, status = ?, description = ?,
         cover_image_url = ?, safety_level = ?, popularity_score = ?, updated_at = ?,
         address = ?, latitude = ?, longitude = ?, search_keywords = ?
     WHERE destination_id = ?`,
    [
      input.name,
      input.country,
      input.region,
      input.city,
      input.category,
      input.status,
      input.description ?? null,
      input.coverImageUrl ?? existing.coverImageUrl,
      input.safetyLevel,
      input.popularityScore,
      now,
      input.address ?? null,
      input.latitude,
      input.longitude,
      input.searchKeywords,
      destinationId,
    ],
  );

  await writeDestinationStatusProjection(destinationId, input, actorUserId);

  return findInternalDestination(destinationId);
}

export async function archiveInternalDestination(destinationId: string, actorUserId: string) {
  const existing = await findInternalDestination(destinationId);

  if (!existing) {
    return null;
  }

  return updateInternalDestination(
    destinationId,
    {
      ...existing,
      status: "archived",
    },
    actorUserId,
  );
}

export async function restoreInternalDestination(destinationId: string, actorUserId: string) {
  const existing = await findInternalDestination(destinationId);

  if (!existing) {
    return null;
  }

  if (existing.status !== "archived") {
    return existing;
  }

  return updateInternalDestination(
    destinationId,
    {
      ...existing,
      status: "draft",
    },
    actorUserId,
  );
}

export async function hardDeleteInternalDestination(destinationId: string) {
  const existing = await findInternalDestination(destinationId);

  if (!existing) {
    return null;
  }

  const media = await listDestinationMedia(destinationId);

  for (const item of media) {
    await executeQuery(
      "DELETE FROM destination_media_by_destination WHERE destination_id = ? AND media_order = ? AND media_id = ?",
      [destinationId, item.mediaOrder, item.mediaId],
    );
  }

  for (const currentStatus of DESTINATION_STATUSES) {
    let pageState: string | Buffer | null | undefined;

    do {
      const page: { pageState: string | Buffer | null; rows: DestinationStatusRow[] } = await executePagedQuery<DestinationStatusRow>(
        "SELECT updated_at, destination_id FROM destination_status_by_admin WHERE status = ?",
        [currentStatus],
        {
          fetchSize: 500,
          pageState,
        },
      );

      pageState = page.pageState;

      for (const row of page.rows) {
        if (String(row.destination_id) !== destinationId) {
          continue;
        }

        await executeQuery(
          "DELETE FROM destination_status_by_admin WHERE status = ? AND updated_at = ? AND destination_id = ?",
          [currentStatus, row.updated_at, destinationId],
        );
      }
    } while (pageState);
  }

  await executeQuery("DELETE FROM destinations_by_id WHERE destination_id = ?", [destinationId]);

  return {
    destination: existing,
    media,
  };
}

export async function listDestinationMedia(destinationId: string) {
  const rows = await executeQuery<DestinationMediaRow>(
    `SELECT destination_id, media_order, media_id, media_type, media_url, thumbnail_url,
            title, uploaded_by, uploaded_at
     FROM destination_media_by_destination
     WHERE destination_id = ?
     ORDER BY media_order ASC, media_id ASC`,
    [destinationId],
  );

  return rows.map(toDestinationMedia);
}

export async function findDestinationMedia(destinationId: string, mediaId: string) {
  const rows = await executeQuery<DestinationMediaRow>(
    `SELECT destination_id, media_order, media_id, media_type, media_url, thumbnail_url,
            title, uploaded_by, uploaded_at
     FROM destination_media_by_destination
     WHERE destination_id = ?`,
    [destinationId],
  );

  return rows.map(toDestinationMedia).find((media) => media.mediaId === mediaId) ?? null;
}

export async function addDestinationMedia(
  destinationId: string,
  input: {
    mediaType: string;
    mediaUrl: string;
    thumbnailUrl: string;
    title: string | null;
    uploadedBy: string;
    isCover?: boolean;
  },
) {
  const existingMedia = await listDestinationMedia(destinationId);
  const mediaId = String(uuidv7());
  const mediaOrder = existingMedia.length + 1;
  const uploadedAt = new Date();

  await executeQuery(
    `INSERT INTO destination_media_by_destination
      (destination_id, media_order, media_id, media_type, media_url, thumbnail_url, title, uploaded_by, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      destinationId,
      mediaOrder,
      mediaId,
      input.mediaType,
      input.mediaUrl,
      input.thumbnailUrl,
      input.title,
      input.uploadedBy,
      uploadedAt,
    ],
  );

  const destination = await findInternalDestination(destinationId);

  if (destination && (input.isCover || !destination.coverImageUrl)) {
    await executeQuery(
      "UPDATE destinations_by_id SET cover_image_url = ?, updated_at = ? WHERE destination_id = ?",
      [input.mediaUrl, uploadedAt, destinationId],
    );
  }

  return {
    mediaId,
    mediaOrder,
    mediaType: input.mediaType,
    mediaUrl: input.mediaUrl,
    thumbnailUrl: input.thumbnailUrl,
    title: input.title,
    uploadedAt: uploadedAt.toISOString(),
    uploadedBy: input.uploadedBy,
    destinationId,
  };
}

export async function setDestinationCoverImage(destinationId: string, coverImageUrl: string | null) {
  await executeQuery(
    "UPDATE destinations_by_id SET cover_image_url = ?, updated_at = ? WHERE destination_id = ?",
    [coverImageUrl, new Date(), destinationId],
  );
}

export async function deleteDestinationMedia(destinationId: string, mediaId: string) {
  const existingMedia = await findDestinationMedia(destinationId, mediaId);

  if (!existingMedia) {
    return null;
  }

  await executeQuery(
    "DELETE FROM destination_media_by_destination WHERE destination_id = ? AND media_order = ? AND media_id = ?",
    [destinationId, existingMedia.mediaOrder, mediaId],
  );

  const remaining = await listDestinationMedia(destinationId);
  const nextCover = remaining[0]?.mediaUrl ?? null;

  await executeQuery(
    "UPDATE destinations_by_id SET cover_image_url = ?, updated_at = ? WHERE destination_id = ?",
    [nextCover, new Date(), destinationId],
  );

  return existingMedia;
}
