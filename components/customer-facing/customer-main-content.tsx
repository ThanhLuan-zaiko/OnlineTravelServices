import type { PublicTourFeed } from "@/lib/shared/public-tours";

import { PublicTourExperience } from "./public-tour-experience";

export function CustomerMainContent({ feed }: { feed: PublicTourFeed }) {
  return (
    <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <PublicTourExperience feed={feed} />
      </div>
    </section>
  );
}
