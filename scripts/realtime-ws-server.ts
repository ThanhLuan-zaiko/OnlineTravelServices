import { timingSafeEqual } from "node:crypto";

import {
  isValidRealtimeChannel,
  PUBLIC_TOUR_REALTIME_CHANNEL,
  type RealtimePublishEnvelope,
} from "../lib/shared/realtime";

type WebSocketData = {
  channel: string;
};

type BunWebSocket = {
  close: () => void;
  data?: WebSocketData;
  send: (data: string) => number;
};

type BunServer = {
  upgrade: (request: Request, options?: { data?: WebSocketData }) => boolean;
};

declare const Bun: {
  serve: (options: {
    fetch: (request: Request, server: BunServer) => Response | undefined | Promise<Response | undefined>;
    port: number;
    websocket: {
      close: (webSocket: BunWebSocket) => void;
      message: (webSocket: BunWebSocket, message: string | Buffer) => void;
      open: (webSocket: BunWebSocket) => void;
    };
  }) => { port: number };
};

const DEFAULT_PORT = 3002;
const HEARTBEAT_INTERVAL_MS = 30_000;

const channels = new Map<string, Set<BunWebSocket>>();

function getPort() {
  const parsedPort = Number.parseInt(
    process.env.REALTIME_WS_PORT ?? process.env.PUBLIC_TOUR_WS_PORT ?? "",
    10,
  );

  return Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : DEFAULT_PORT;
}

function getEventsSecret() {
  return process.env.REALTIME_EVENTS_SECRET ?? process.env.PUBLIC_TOUR_EVENTS_SECRET;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function isAuthorized(request: Request) {
  const secret = getEventsSecret();

  if (!secret) {
    return true;
  }

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function getChannelFromRequest(request: Request) {
  const url = new URL(request.url);

  if (url.pathname === "/public-tour-updates") {
    return PUBLIC_TOUR_REALTIME_CHANNEL;
  }

  const channel = url.searchParams.get("channel")?.trim() ?? "";

  return isValidRealtimeChannel(channel) ? channel : null;
}

function getClientSet(channel: string) {
  let clients = channels.get(channel);

  if (!clients) {
    clients = new Set<BunWebSocket>();
    channels.set(channel, clients);
  }

  return clients;
}

function removeClient(webSocket: BunWebSocket) {
  const channel = webSocket.data?.channel;

  if (!channel) {
    return;
  }

  const clients = channels.get(channel);
  clients?.delete(webSocket);

  if (clients?.size === 0) {
    channels.delete(channel);
  }
}

function channelClientCounts() {
  return [...channels.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([channel, clients]) => ({ channel, clients: clients.size }));
}

function broadcast(channel: string, event: unknown) {
  const payload = JSON.stringify(event);
  const clients = channels.get(channel);

  if (!clients) {
    return 0;
  }

  for (const client of clients) {
    try {
      client.send(payload);
    } catch {
      removeClient(client);
      client.close();
    }
  }

  return clients.size;
}

function parsePublishBody(value: unknown, fallbackChannel: string): RealtimePublishEnvelope {
  if (value && typeof value === "object") {
    const candidate = value as { channel?: unknown; event?: unknown };

    if (typeof candidate.channel === "string" && "event" in candidate) {
      return {
        channel: candidate.channel,
        event: candidate.event,
      };
    }
  }

  return {
    channel: fallbackChannel,
    event: value,
  };
}

async function handlePublish(request: Request) {
  if (!isAuthorized(request)) {
    return jsonResponse({ message: "Unauthorized." }, 401);
  }

  try {
    const url = new URL(request.url);
    const fallbackChannel = url.pathname.startsWith("/publish/")
      ? decodeURIComponent(url.pathname.slice("/publish/".length))
      : PUBLIC_TOUR_REALTIME_CHANNEL;
    const envelope = parsePublishBody(await request.json(), fallbackChannel);

    if (!isValidRealtimeChannel(envelope.channel)) {
      return jsonResponse({ message: "Invalid realtime channel." }, 400);
    }

    const clients = broadcast(envelope.channel, envelope.event);

    return jsonResponse({ channel: envelope.channel, clients, ok: true }, 202);
  } catch {
    return jsonResponse({ message: "Invalid JSON." }, 400);
  }
}

const server = Bun.serve({
  port: getPort(),
  fetch(request, bunServer) {
    const url = new URL(request.url);

    if (
      request.method === "GET" &&
      (url.pathname === "/realtime-updates" || url.pathname === "/public-tour-updates")
    ) {
      const channel = getChannelFromRequest(request);

      if (!channel) {
        return jsonResponse({ message: "Invalid realtime channel." }, 400);
      }

      if (bunServer.upgrade(request, { data: { channel } })) {
        return undefined;
      }

      return jsonResponse({ message: "WebSocket upgrade failed." }, 400);
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return jsonResponse({
        channels: channelClientCounts(),
        clients: channelClientCounts().reduce((sum, item) => sum + item.clients, 0),
        ok: true,
      });
    }

    if (
      request.method === "POST" &&
      (url.pathname === "/publish" || url.pathname.startsWith("/publish/"))
    ) {
      return handlePublish(request);
    }

    return jsonResponse({ message: "Not found." }, 404);
  },
  websocket: {
    close(webSocket) {
      removeClient(webSocket);
    },
    message(webSocket, message) {
      if (String(message) === "ping") {
        webSocket.send(JSON.stringify({ type: "pong" }));
      }
    },
    open(webSocket) {
      const channel = webSocket.data?.channel;

      if (!channel) {
        webSocket.close();
        return;
      }

      getClientSet(channel).add(webSocket);
    },
  },
});

setInterval(() => {
  for (const clients of channels.values()) {
    for (const client of clients) {
      try {
        client.send(JSON.stringify({ type: "ping" }));
      } catch {
        removeClient(client);
        client.close();
      }
    }
  }
}, HEARTBEAT_INTERVAL_MS).unref();

console.log(`Realtime WebSocket server is listening on port ${server.port}.`);
