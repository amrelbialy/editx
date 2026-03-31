import { Link, useLocation } from "react-router";

const SIDEBAR: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Image Editor",
    links: [
      { label: "Getting Started", href: "/docs/image-editor/getting-started" },
      { label: "Configuration", href: "/docs/image-editor/configuration" },
      { label: "API Reference", href: "/docs/image-editor/api" },
      { label: "Theming", href: "/docs/image-editor/theming" },
    ],
  },
  {
    heading: "Engine",
    links: [
      { label: "Overview", href: "/docs/engine/overview" },
      { label: "Blocks", href: "/docs/engine/blocks" },
      { label: "Engine API", href: "/docs/engine/engine-api" },
      { label: "Block API", href: "/docs/engine/block-api" },
      { label: "Editor API", href: "/docs/engine/editor-api" },
      { label: "Scene & Events", href: "/docs/engine/scene-api" },
      { label: "Variable API", href: "/docs/engine/variable-api" },
    ],
  },
];

export function DocsLayout(props: { children: React.ReactNode }) {
  const { children } = props;
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Sidebar */}
      <aside className="hidden md:block w-56 shrink-0 border-r border-zinc-200 dark:border-zinc-800 p-5 overflow-y-auto sticky top-14 h-[calc(100vh-3.5rem)]">
        <nav className="flex flex-col gap-6">
          {SIDEBAR.map((group) => (
            <div key={group.heading}>
              <h4 className="text-xs font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase mb-2">
                {group.heading}
              </h4>
              <ul className="flex flex-col gap-1">
                {group.links.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        to={link.href}
                        className={`block px-2.5 py-1.5 rounded-md text-sm no-underline transition-colors ${
                          active
                            ? "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium"
                            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 max-w-3xl mx-auto px-6 md:px-10 py-10">
        <article className="prose-docs">{children}</article>
      </main>
    </div>
  );
}
