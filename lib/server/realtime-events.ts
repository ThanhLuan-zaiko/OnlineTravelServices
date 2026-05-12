import "server-only";

import { isValidRealtimeChannel, type RealtimePublishEnvelope } from "@/lib/shared/realtime";

const DEFAULT_REALTIME_WS_PORT = "3002";

function getPublishUrl() {
  if (process.env.REALTIME_WS_PUBLISH_URL) {
    return process.env.REALTIME_WS_PUBLISH_URL;
  }

  if (process.env.PUBLIC_TOUR_WS_PUBLISH_URL) {
    return process.env.PUBLIC_TOUR_WS_PUBLISH_URL;
  }

  const port = process.env.REALTIME_WS_PORT ?? process.env.PUBLIC_TOUR_WS_PORT ?? DEFAULT_REALTIME_WS_PORT;
  return `http://127.0.0.1:${port}/publish`;
}

function getEventsSecret() {
  return process.env.REALTIME_EVENTS_SECRET ?? process.env.PUBLIC_TOUR_EVENTS_SECRET;
}

export async function publishRealtimeEvent<TEvent>(channel: string, event: TEvent) {
  if (!isValidRealtimeChannel(channel)) {
    console.warn(`Realtime publish skipped invalid channel "${channel}".`);
    return;
  }

  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    const secret = getEventsSecret();
    const envelope: RealtimePublishEnvelope<TEvent> = { channel, event };

    if (secret) {
      headers.Authorization = `Bearer ${secret}`;
    }

    const response = await fetch(getPublishUrl(), {
      body: JSON.stringify(envelope),
      headers,
      method: "POST",
    });

    if (!response.ok) {
      console.warn(`Realtime publish failed for ${channel} with status ${response.status}.`);
    }
  } catch (error) {
    console.warn(`Realtime publish failed for ${channel}.`, error);
  }
}
