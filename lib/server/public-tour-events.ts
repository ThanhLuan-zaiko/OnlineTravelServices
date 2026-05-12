import "server-only";

import { publishRealtimeEvent } from "@/lib/server/realtime-events";
import type { PublicTourEvent } from "@/lib/shared/public-tours";
import { PUBLIC_TOUR_REALTIME_CHANNEL } from "@/lib/shared/realtime";

export async function publishPublicTourEvent(event: PublicTourEvent) {
  await publishRealtimeEvent(PUBLIC_TOUR_REALTIME_CHANNEL, event);
}
