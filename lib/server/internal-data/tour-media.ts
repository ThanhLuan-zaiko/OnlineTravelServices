import "server-only";

import { uuidv7 } from "uuidv7";

import { executeQuery } from "@/lib/server/scylla";

import { findInternalTour } from "./tours";
import { toTourMedia, type TourMediaRow } from "./shared";

export async function listTourMedia(tourId: string) {
  const rows = await executeQuery<TourMediaRow>(
    `SELECT media_id, media_order, media_type, media_url, thumbnail_url, title, uploaded_at, uploaded_by
     FROM tour_media_by_tour
     WHERE tour_id = ?
     ORDER BY media_order ASC, media_id ASC`,
    [tourId],
  );

  return rows.map(toTourMedia);
}

export async function findTourMedia(tourId: string, mediaId: string) {
  const rows = await executeQuery<TourMediaRow>(
    `SELECT media_id, media_order, media_type, media_url, thumbnail_url, title, uploaded_at, uploaded_by
     FROM tour_media_by_tour
     WHERE tour_id = ?`,
    [tourId],
  );

  return rows.map(toTourMedia).find((media) => media.mediaId === mediaId) ?? null;
}

async function setTourCoverImage(tourId: string, coverImageUrl: string | null) {
  const tour = await findInternalTour(tourId);

  if (!tour) {
    return;
  }

  await Promise.all([
    executeQuery("UPDATE tours_by_id SET cover_image_url = ?, updated_at = ? WHERE tour_id = ?", [
      coverImageUrl,
      new Date(),
      tourId,
    ]),
    executeQuery(
      `UPDATE tours_by_destination
       SET cover_image_url = ?
       WHERE destination_id = ? AND status = ? AND popularity_score = ? AND tour_id = ?`,
      [coverImageUrl, tour.destinationId, tour.status, 0, tourId],
    ),
  ]);
}

export async function addTourMedia(
  tourId: string,
  input: {
    mediaType: string;
    mediaUrl: string;
    thumbnailUrl: string;
    title: string | null;
    uploadedBy: string;
    isCover?: boolean;
  },
) {
  const existing = await listTourMedia(tourId);
  const mediaId = String(uuidv7());
  const mediaOrder = existing.length + 1;
  const uploadedAt = new Date();

  await executeQuery(
    `INSERT INTO tour_media_by_tour
      (tour_id, media_order, media_id, media_type, media_url, thumbnail_url, title, uploaded_by, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      tourId,
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

  if (input.isCover) {
    await setTourCoverImage(tourId, input.mediaUrl);
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
  };
}

export async function setTourMediaCover(tourId: string, mediaId: string) {
  const media = await findTourMedia(tourId, mediaId);

  if (!media) {
    return null;
  }

  await setTourCoverImage(tourId, media.mediaUrl);

  return media;
}

export async function deleteTourMedia(tourId: string, mediaId: string) {
  const media = await findTourMedia(tourId, mediaId);

  if (!media) {
    return null;
  }

  await executeQuery("DELETE FROM tour_media_by_tour WHERE tour_id = ? AND media_order = ? AND media_id = ?", [
    tourId,
    media.mediaOrder,
    mediaId,
  ]);

  const remaining = await listTourMedia(tourId);

  await setTourCoverImage(tourId, remaining[0]?.mediaUrl ?? null);

  return media;
}
