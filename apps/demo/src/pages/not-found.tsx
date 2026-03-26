import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-white dark:bg-zinc-950">
      <div className="text-center">
        <p className="text-7xl font-bold text-zinc-200 dark:text-zinc-800">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Page not found
        </h1>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white no-underline hover:bg-violet-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
