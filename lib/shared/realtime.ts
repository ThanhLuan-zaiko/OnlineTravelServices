export const PUBLIC_TOUR_REALTIME_CHANNEL = "public-tours";

export type RealtimePublishEnvelope<TEvent = unknown> = {
  channel: string;
  event: TEvent;
};

export function isValidRealtimeChannel(channel: string) {
  return /^[a-z0-9:_-]{1,80}$/i.test(channel);
}
