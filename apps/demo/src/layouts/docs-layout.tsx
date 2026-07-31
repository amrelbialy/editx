import { useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { OnThisPage } from "../components/docs/on-this-page";
import { PrevNextNav } from "../components/docs/prev-next";
import { DocsSidebar } from "../components/docs/sidebar";

export function DocsLayout(props: { children: React.ReactNode }) {
  const { children } = props;

  const articleRef = useRef<HTMLElement>(null);

  const { pathname } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* Left navigation */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-zinc-200 p-5 md:block dark:border-zinc-800">
        <DocsSidebar pathname={pathname} />
      </aside>

      {/* Content */}
      <main className="mx-auto flex min-w-0 max-w-3xl flex-1 flex-col px-6 py-10 md:px-10">
        <article ref={articleRef} className="prose-docs">
          {children}
        </article>
        <PrevNextNav pathname={pathname} />
      </main>

      {/* On this page */}
      <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto py-10 pr-6 xl:block">
        <OnThisPage containerRef={articleRef} pathname={pathname} />
      </aside>
    </div>
  );
}
