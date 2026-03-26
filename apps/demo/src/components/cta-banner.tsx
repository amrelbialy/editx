export function CtaBanner() {
  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Ready to build?</h2>
        <p className="mt-3 text-lg text-zinc-500 dark:text-zinc-400">
          Add a powerful image editor to your React app in under 5 minutes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="/docs/image-editor/getting-started"
            className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-medium text-white shadow-[0_4px_16px_-2px_rgba(124,58,237,0.4)] no-underline transition-all hover:bg-violet-700 hover:shadow-[0_6px_24px_-2px_rgba(124,58,237,0.5)]"
          >
            Read the Docs
          </a>
          <a
            href="/playground"
            className="inline-flex items-center gap-2 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 no-underline transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Open Playground
          </a>
        </div>
      </div>
    </section>
  );
}
