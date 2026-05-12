"use client";

import { useEffect, useRef } from "react";

function getRealtimeWebSocketUrl(channel: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_REALTIME_WS_URL ?? process.env.NEXT_PUBLIC_PUBLIC_TOUR_WS_URL;

  if (configuredUrl) {
    const url = new URL(configuredUrl);
    url.searchParams.set("channel", channel);
    return url.toString();
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:3002/realtime-updates?channel=${encodeURIComponent(channel)}`;
}

export function useRealtimeChannel<TEvent>(
  channel: string,
  onEvent: (event: TEvent) => void,
) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let socket: WebSocket | null = null;
    let cancelled = false;

    const connect = () => {
      socket = new WebSocket(getRealtimeWebSocketUrl(channel));

      socket.addEventListener("message", (event) => {
        try {
          const parsed = JSON.parse(String(event.data)) as unknown;

          if (
            parsed &&
            typeof parsed === "object" &&
            "type" in parsed &&
            ((parsed as { type?: unknown }).type === "ping" || (parsed as { type?: unknown }).type === "pong")
          ) {
            return;
          }

          onEventRef.current(parsed as TEvent);
        } catch {
          // Ignore malformed packets from a stale connection.
        }
      });

      socket.addEventListener("close", () => {
        if (!cancelled) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      });
    };

    connect();

    return () => {
      cancelled = true;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      socket?.close();
    };
  }, [channel]);
}
