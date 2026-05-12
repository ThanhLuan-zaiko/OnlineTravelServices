"use client";

import Link from "next/link";
import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FiSend, FiStar } from "react-icons/fi";

import { useToast } from "@/components/ui/toast";
import {
  createPublicTourReview,
  getPublicTourReviews,
  type ApiError,
} from "@/lib/client/api-client";
import type { PublicTourReviewListResponse } from "@/lib/shared/public-tours";
import { useAuthSession } from "@/hooks/use-auth-session";

type TourReviewPanelProps = {
  slug: string;
};

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <FiStar
          fill={index < value ? "currentColor" : "none"}
          key={index}
          size={15}
        />
      ))}
    </span>
  );
}

export function TourReviewPanel({ slug }: TourReviewPanelProps) {
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const sessionQuery = useAuthSession();
  const user = sessionQuery.data?.user ?? null;
  const reviewsQuery = useInfiniteQuery<PublicTourReviewListResponse>({
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null,
    queryFn: ({ pageParam }) =>
      getPublicTourReviews({
        cursor: typeof pageParam === "string" ? pageParam : null,
        limit: 6,
        slugOrId: slug,
      }),
    queryKey: ["public", "tour-reviews", slug],
  });
  const reviews = reviewsQuery.data?.pages.flatMap((page) => page.reviews) ?? [];
  const mutation = useMutation({
    mutationFn: () => createPublicTourReview(slug, { comment, rating }),
    onError: (error: ApiError) => {
      showToast({
        message: error.message || "Không thể gửi đánh giá lúc này.",
        title: "Đánh giá chưa được gửi",
        variant: "error",
      });
    },
    onSuccess: async () => {
      setComment("");
      setRating(5);
      await queryClient.invalidateQueries({ queryKey: ["public", "tour-reviews", slug] });
      await queryClient.invalidateQueries({ queryKey: ["public", "tours"] });
      showToast({
        message: "Đánh giá của bạn đã được ghi nhận.",
        title: "Đã gửi đánh giá",
        variant: "success",
      });
    },
  });

  const canSubmit = Boolean(user) && comment.trim().length >= 3 && !mutation.isPending;

  return (
    <section className="rounded-lg border border-slate-200 p-5 dark:border-neutral-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Bình luận và đánh giá</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
            Chỉ khách hàng đã đăng nhập mới có thể gửi đánh giá.
          </p>
        </div>
        {!user ? (
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-sky-200 px-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 dark:border-sky-900 dark:text-sky-300 dark:hover:bg-sky-950/40"
            href={`/login?next=${encodeURIComponent(`/tours/${slug}`)}`}
          >
            Đăng nhập
          </Link>
        ) : null}
      </div>

      {user ? (
        <form
          className="mt-5 rounded-lg bg-slate-50 p-4 dark:bg-neutral-900"
          onSubmit={(event) => {
            event.preventDefault();

            if (canSubmit) {
              mutation.mutate();
            }
          }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Chấm điểm</span>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                aria-label={`${value} sao`}
                className={`flex h-9 w-9 items-center justify-center rounded-md border transition ${
                  rating === value
                    ? "border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-900 dark:bg-amber-950/40"
                    : "border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-600 dark:border-neutral-800"
                }`}
                key={value}
                onClick={() => setRating(value)}
                type="button"
              >
                <FiStar fill={rating >= value ? "currentColor" : "none"} size={16} />
              </button>
            ))}
          </div>
          <textarea
            className="mt-3 min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-neutral-800 dark:bg-black"
            onChange={(event) => setComment(event.target.value)}
            placeholder="Viết nhận xét về tour"
            value={comment}
          />
          <button
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-neutral-50 dark:text-black dark:hover:bg-sky-200"
            disabled={!canSubmit}
            type="submit"
          >
            <FiSend size={15} />
            {mutation.isPending ? "Đang gửi" : "Gửi đánh giá"}
          </button>
        </form>
      ) : null}

      <div className="mt-5 flex flex-col gap-3">
        {reviews.map((review) => (
          <article className="rounded-lg border border-slate-200 p-4 dark:border-neutral-800" key={review.reviewId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{review.fullName}</p>
                {review.isVipReview ? (
                  <p className="mt-1 text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-300">
                    VIP
                  </p>
                ) : null}
              </div>
              <Stars value={review.rating} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-neutral-400">
              {review.comment}
            </p>
          </article>
        ))}

        {reviewsQuery.isLoading ? (
          <p className="text-sm text-slate-600 dark:text-neutral-400">Đang tải đánh giá...</p>
        ) : null}

        {!reviewsQuery.isLoading && reviews.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            Chưa có đánh giá cho tour này.
          </p>
        ) : null}

        {reviewsQuery.hasNextPage ? (
          <button
            className="h-10 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 dark:border-neutral-800 dark:text-neutral-200"
            disabled={reviewsQuery.isFetchingNextPage}
            onClick={() => reviewsQuery.fetchNextPage()}
            type="button"
          >
            {reviewsQuery.isFetchingNextPage ? "Đang tải" : "Tải thêm đánh giá"}
          </button>
        ) : null}
      </div>
    </section>
  );
}
