import { ContentPlaceholder } from "./content-placeholder";

export function CustomerMainContent() {
  return (
    <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <ContentPlaceholder />
      </div>
    </section>
  );
}
