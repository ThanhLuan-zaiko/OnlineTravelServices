import "server-only";

import { types } from "cassandra-driver";
import { uuidv7 } from "uuidv7";

import { DEFAULT_VIP_TIER } from "@/lib/server/auth-constants";
import { executePagedQuery, executeQuery } from "@/lib/server/scylla";
import type { AuthUser } from "@/lib/shared/auth";
import type {
  PublicTourReview,
  TourReviewMutationRequest,
} from "@/lib/shared/public-tours";

import { decimal } from "./internal-data/shared";
import { findInternalTour } from "./internal-data/tours";
import { syncPublicTourProjection } from "./public-tours";

const DEFAULT_REVIEW_PAGE_SIZE = 6;
const MAX_REVIEW_PAGE_SIZE = 30;

type ReviewRow = {
  comment: string;
  full_name: string;
  is_vip_review: boolean | null;
  rating: number;
  review_id: string;
  review_time: unknown;
  status: string;
  tour_id: string;
  user_id: string;
};

function clampReviewPageSize(limit?: number) {
  if (!Number.isFinite(limit) || !limit) {
    return DEFAULT_REVIEW_PAGE_SIZE;
  }

  return Math.min(Math.max(Math.trunc(limit), 1), MAX_REVIEW_PAGE_SIZE);
}

function toPublicReview(row: ReviewRow): PublicTourReview {
  return {
    comment: row.comment,
    fullName: row.full_name,
    isVipReview: Boolean(row.is_vip_review),
    rating: row.rating,
    reviewId: String(row.review_id),
    reviewTime: String(row.review_time),
    status: row.status,
    tourId: String(row.tour_id),
    userId: String(row.user_id),
  };
}

async function findTourBySlug(slug: string) {
  const rows = await executeQuery<{ tour_id: string }>(
    "SELECT tour_id FROM tours_by_id WHERE slug = ? LIMIT 1",
    [slug],
  );

  return rows[0] ? findInternalTour(String(rows[0].tour_id)) : null;
}

async function findPublishedTour(slugOrId: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slugOrId);
  const tour = isUuid ? await findInternalTour(slugOrId) : await findTourBySlug(slugOrId);

  return tour?.status === "published" ? tour : null;
}

async function refreshTourRating(tourId: string) {
  const rows = await executeQuery<{ rating: number }>(
    "SELECT rating FROM reviews_by_tour WHERE tour_id = ? LIMIT 500",
    [tourId],
  );
  const ratings = rows.map((row) => row.rating).filter((rating) => rating >= 1 && rating <= 5);
  const ratingCount = ratings.length;
  const averageRating = ratingCount > 0
    ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratingCount).toFixed(2)
    : "0";
  const buckets = new Map<number, number>();

  for (const rating of ratings) {
    buckets.set(rating, (buckets.get(rating) ?? 0) + 1);
  }

  const tour = await findInternalTour(tourId);

  if (!tour) {
    return;
  }

  await Promise.all([
    executeQuery(
      "UPDATE tours_by_id SET average_rating = ?, rating_count = ?, updated_at = ? WHERE tour_id = ?",
      [decimal(averageRating), ratingCount, new Date(), tourId],
    ),
    executeQuery(
      `UPDATE tours_by_destination
       SET average_rating = ?
       WHERE destination_id = ? AND status = ? AND popularity_score = ? AND tour_id = ?`,
      [decimal(averageRating), tour.destinationId, tour.status, 0, tourId],
    ),
    executeQuery(
      `UPDATE tours_by_category
       SET average_rating = ?
       WHERE category = ? AND status = ? AND base_price = ? AND tour_id = ?`,
      [decimal(averageRating), tour.category, tour.status, decimal(tour.basePrice), tourId],
    ),
    ...[1, 2, 3, 4, 5].map((bucket) =>
      executeQuery(
        `INSERT INTO tour_rating_summary
          (tour_id, rating_bucket, review_count)
         VALUES (?, ?, ?)`,
        [tourId, bucket, buckets.get(bucket) ?? 0],
      ),
    ),
  ]);

  await syncPublicTourProjection(tourId);
}

export async function listPublicTourReviews(
  slugOrId: string,
  options?: {
    cursor?: string | null;
    limit?: number;
  },
) {
  const tour = await findPublishedTour(slugOrId);

  if (!tour) {
    return null;
  }

  const limit = clampReviewPageSize(options?.limit);
  const page = await executePagedQuery<ReviewRow>(
    `SELECT tour_id, review_time, review_id, user_id, full_name, rating, comment, status, is_vip_review
     FROM reviews_by_tour
     WHERE tour_id = ?`,
    [tour.tourId],
    {
      fetchSize: limit,
      pageState: options?.cursor ?? undefined,
    },
  );

  return {
    nextCursor: page.pageState ? String(page.pageState) : null,
    reviews: page.rows.slice(0, limit).map(toPublicReview),
  };
}

export async function createPublicTourReview(
  slugOrId: string,
  user: AuthUser,
  input: TourReviewMutationRequest,
) {
  const tour = await findPublishedTour(slugOrId);

  if (!tour) {
    return null;
  }

  const reviewId = String(uuidv7());
  const reviewTime = String(types.TimeUuid.now());
  const isVipReview = user.vipTier !== DEFAULT_VIP_TIER;

  await Promise.all([
    executeQuery(
      `INSERT INTO reviews_by_tour
        (tour_id, review_time, review_id, user_id, full_name, rating, comment, status, is_vip_review)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tour.tourId,
        reviewTime,
        reviewId,
        user.userId,
        user.fullName,
        input.rating,
        input.comment,
        "published",
        isVipReview,
      ],
    ),
    executeQuery(
      `INSERT INTO reviews_by_user
        (user_id, review_time, review_id, tour_id, tour_title, rating, comment, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.userId,
        reviewTime,
        reviewId,
        tour.tourId,
        tour.title,
        input.rating,
        input.comment,
        "published",
      ],
    ),
  ]);

  await refreshTourRating(tour.tourId);

  return {
    comment: input.comment,
    fullName: user.fullName,
    isVipReview,
    rating: input.rating,
    reviewId,
    reviewTime,
    status: "published",
    tourId: tour.tourId,
    userId: user.userId,
  } satisfies PublicTourReview;
}
