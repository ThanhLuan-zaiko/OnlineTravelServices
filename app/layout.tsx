import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Online Travel Services",
  description: "Travel services platform powered by Next.js and ScyllaDB",
};

const THEME_COOKIE_KEY = "online-travel-theme";

const preferencesInitScript = `
(() => {
  try {
    const themeStorageKey = "online-travel-theme";
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    const theme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system" ? storedTheme : "system";
    const resolvedTheme = theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : theme === "dark" ? "dark" : "light";
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    document.cookie = themeStorageKey + "=" + theme + "; path=/; max-age=31536000; samesite=lax";
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch {}
})();
`;

function readInitialTheme(value: string | undefined) {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }

  return "system";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialTheme = readInitialTheme(cookieStore.get(THEME_COOKIE_KEY)?.value);
  const initialDarkClass = initialTheme === "dark" ? " dark" : "";

  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${initialDarkClass}`}
      suppressHydrationWarning
    >
      <head>
        <Script
          dangerouslySetInnerHTML={{ __html: preferencesInitScript }}
          id="app-preferences-init"
          strategy="beforeInteractive"
        />
      </head>
      <body className="flex min-h-full flex-col bg-white text-slate-950 dark:bg-black dark:text-neutral-50">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
