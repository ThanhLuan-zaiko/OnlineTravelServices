"use client";

import { useQueryClient } from "@tanstack/react-query";

import { useRealtimeChannel } from "@/hooks/use-realtime-channel";
import type { PublicTourEvent, PublicTourFeed } from "@/lib/shared/public-tours";
import { PUBLIC_TOUR_REALTIME_CHANNEL } from "@/lib/shared/realtime";

function isPublicTourEvent(value: unknown): value is PublicTourEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { feeds?: unknown; type?: unknown };

  return typeof candidate.type === "string" && Array.isArray(candidate.feeds);
}

export function usePublicTourUpdates(feed: PublicTourFeed) {
  const queryClient = useQueryClient();

  useRealtimeChannel<PublicTourEvent>(PUBLIC_TOUR_REALTIME_CHANNEL, (event) => {
    if (!isPublicTourEvent(event)) {
      return;
    }

    if (!event.feeds.includes(feed) && !event.feeds.includes("all")) {
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ["public", "tours"] });
    void queryClient.invalidateQueries({ queryKey: ["public", "tour-countries"] });
  });
}
