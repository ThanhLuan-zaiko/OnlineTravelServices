import "server-only";

import { AuthError } from "@/lib/server/auth";

export function assertSameOriginRequest(request: Request) {
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (secFetchSite === "cross-site") {
    throw new AuthError("Yêu cầu không hợp lệ.", 403);
  }

  const origin = request.headers.get("origin");

  if (!origin) {
    return;
  }

  const requestOrigin = new URL(request.url).origin;

  if (origin !== requestOrigin) {
    throw new AuthError("Yêu cầu không hợp lệ.", 403);
  }
}
