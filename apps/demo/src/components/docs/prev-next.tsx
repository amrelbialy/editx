import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { getAdjacentDocs } from "../../docs/docs-nav";

/** Bottom-of-page previous/next navigation following the docs nav order. */
export function PrevNextNav(props: { pathname: string }) {
  const { pathname } = props;
  const { prev, next } = getAdjacentDocs(pathname);

  if (!prev && !next) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-12 grid grid-cols-1 gap-3 border-t border-zinc-200 pt-6 sm:grid-cols-2 dark:border-zinc-800"
    >
      {prev ? (
        <Link
          to={prev.href}
          className="group flex flex-col gap-1 rounded-xl border border-zinc-200 p-4 no-underline transition-colors hover:border-violet-300 hover:bg-violet-50/40 dark:border-zinc-800 dark:hover:border-violet-800 dark:hover:bg-violet-950/20"
        >
          <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            <ArrowLeft className="size-3.5" />
            Previous
          </span>
          <span className="font-medium text-zinc-800 group-hover:text-violet-700 dark:text-zinc-200 dark:group-hover:text-violet-400">
            {prev.label}
          </span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          to={next.href}
          className="group flex flex-col items-end gap-1 rounded-xl border border-zinc-200 p-4 text-right no-underline transition-colors hover:border-violet-300 hover:bg-violet-50/40 sm:col-start-2 dark:border-zinc-800 dark:hover:border-violet-800 dark:hover:bg-violet-950/20"
        >
          <span className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            Next
            <ArrowRight className="size-3.5" />
          </span>
          <span className="font-medium text-zinc-800 group-hover:text-violet-700 dark:text-zinc-200 dark:group-hover:text-violet-400">
            {next.label}
          </span>
        </Link>
      )}
    </nav>
  );
}
