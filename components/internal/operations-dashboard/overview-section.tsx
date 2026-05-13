import { InternalPanel } from "../internal-primitives";
import type { OperationsSummaryCard } from "./types";

export function OperationsOverviewSection({ cards }: { cards: OperationsSummaryCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <InternalPanel className="p-4" key={card.label}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-sky-700 dark:border-neutral-800 dark:text-sky-300">
              <Icon size={18} />
            </span>
            <p className="mt-4 text-2xl font-semibold text-slate-950 dark:text-neutral-50">{card.value}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">{card.label}</p>
          </InternalPanel>
        );
      })}
    </div>
  );
}
