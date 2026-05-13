import Link from "next/link";

import { operationModules, operationModuleTabs } from "./config";
import type { OperationsModule, OperationsNavItem, OperationsTab } from "./types";

function OperationsNavigationCard<TKey extends string>({
  active,
  basePath,
  item,
}: {
  active: boolean;
  basePath: string;
  item: OperationsNavItem<TKey>;
}) {
  const Icon = item.icon;
  const href = item.href.replace("/internal/operations", basePath);

  return (
    <Link
      className={`rounded-xl border p-4 transition hover:border-sky-300 hover:text-sky-800 dark:hover:border-sky-900 dark:hover:text-sky-200 ${
        active
          ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100"
          : "border-slate-200 bg-white text-slate-700 dark:border-neutral-800 dark:bg-black dark:text-neutral-300"
      }`}
      href={href}
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-current/20">
        <Icon size={17} />
      </span>
      <p className="mt-3 text-sm font-semibold">{item.label}</p>
      <p className="mt-1 line-clamp-2 text-xs text-current/70">{item.description}</p>
    </Link>
  );
}

export function OperationsModuleNavigation({
  activeModule,
  basePath = "/internal/operations",
}: {
  activeModule: OperationsModule;
  basePath?: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {operationModules.map((item) => (
        <OperationsNavigationCard active={item.key === activeModule} basePath={basePath} item={item} key={item.key} />
      ))}
    </div>
  );
}

export function OperationsTabNavigation({
  activeModule,
  activeTab,
  basePath = "/internal/operations",
}: {
  activeModule: OperationsModule;
  activeTab: OperationsTab;
  basePath?: string;
}) {
  const nestedTabs = operationModuleTabs[activeModule];

  if (nestedTabs.length <= 1) {
    return null;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {nestedTabs.map((item) => (
        <OperationsNavigationCard active={item.key === activeTab} basePath={basePath} item={item} key={item.key} />
      ))}
    </div>
  );
}
