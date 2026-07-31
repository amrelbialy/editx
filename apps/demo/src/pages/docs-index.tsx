import { Link } from "react-router";
import { DOCS_NAV } from "../docs/docs-nav";

export function DocsIndex() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50/60 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-3 text-4xl font-bold">Documentation</h1>
        <p className="mb-10 text-lg text-zinc-500 dark:text-zinc-400">
          Browse the docs for the image editor and engine packages.
        </p>
        <div className="flex flex-col gap-6">
          {DOCS_NAV.map((group) => (
            <div
              key={group.heading}
              className="rounded-2xl border border-zinc-200/80 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_-4px_rgba(0,0,0,0.07)] transition-all duration-300 hover:border-violet-200/60 hover:shadow-[0_2px_8px_rgba(124,58,237,0.06),0_16px_40px_-8px_rgba(124,58,237,0.13)] dark:border-zinc-800/80 dark:bg-zinc-900 dark:hover:border-violet-800/60"
            >
              <h2 className="mb-1 text-xl font-semibold">{group.heading}</h2>
              <p className="mb-5 text-sm text-zinc-500 dark:text-zinc-400">{group.description}</p>
              <div className="flex flex-wrap gap-2">
                {group.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="rounded-lg bg-zinc-100/80 px-3.5 py-1.5 text-sm text-zinc-700 no-underline transition-colors hover:bg-violet-50 hover:text-violet-700 dark:bg-zinc-800/80 dark:text-zinc-300 dark:hover:bg-violet-900/30 dark:hover:text-violet-400"
                  >
                    {link.label} →
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
