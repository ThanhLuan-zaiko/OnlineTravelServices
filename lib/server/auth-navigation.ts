import "server-only";

function isAuthPath(pathname: string) {
  return pathname === "/login" || pathname === "/register" || pathname === "/internal/login";
}

export function getSafeAuthNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  try {
    const url = new URL(value, "http://localhost");

    if (url.origin !== "http://localhost" || isAuthPath(url.pathname)) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function buildAuthAlternateHref(
  href: string,
  nextPath: string | string[] | undefined,
) {
  const nextValue = Array.isArray(nextPath) ? nextPath[0] : nextPath;
  const safeNextPath = getSafeAuthNextPath(nextValue);

  return safeNextPath ? `${href}?next=${encodeURIComponent(safeNextPath)}` : href;
}
