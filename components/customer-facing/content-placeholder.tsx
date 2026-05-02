type ContentPlaceholderProps = {
  description?: string;
  title?: string;
};

export function ContentPlaceholder({
  title = "Nội dung sẽ được hiển thị tại đây",
  description = "Component này là vùng chứa tái sử dụng cho các trang và module trong web app.",
}: ContentPlaceholderProps) {
  return (
    <div className="flex min-h-[22rem] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-neutral-800 dark:bg-black sm:min-h-[28rem] xl:min-h-[calc(100dvh-8.5rem)]">
      <div className="max-w-md">
        <p className="text-sm font-semibold text-sky-700 dark:text-sky-300">
          Khu vực nội dung
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950 dark:text-neutral-50 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-neutral-400">
          {description}
        </p>
      </div>
    </div>
  );
}
