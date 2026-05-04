"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

function isAuthPath(pathname: string) {
  return pathname === "/login" || pathname === "/register" || pathname === "/internal/login";
}

function isProtectedPath(pathname: string) {
  return pathname === "/account" || pathname.startsWith("/internal");
}

function getSafeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin || isAuthPath(url.pathname) || isProtectedPath(url.pathname)) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function AuthExitButton() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleExit = () => {
    const nextPath = getSafeInternalPath(searchParams.get("next"));

    if (nextPath) {
      router.replace(nextPath);
      return;
    }

    try {
      const referrer = new URL(document.referrer);

      if (
        referrer.origin === window.location.origin &&
        !isAuthPath(referrer.pathname) &&
        !isProtectedPath(referrer.pathname)
      ) {
        window.location.assign(`${referrer.pathname}${referrer.search}${referrer.hash}`);
        return;
      }
    } catch {}

    router.replace("/");
  };

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:border-sky-900 dark:hover:bg-neutral-950 dark:hover:text-sky-300"
      onClick={handleExit}
      type="button"
    >
      <FiArrowLeft size={17} />
      Thoát
    </button>
  );
}

export function AuthAlternateLink({
  className,
  href,
  label,
}: {
  className: string;
  href: string;
  label: string;
}) {
  return (
    <Link className={className} href={href}>
      {label}
    </Link>
  );
}
