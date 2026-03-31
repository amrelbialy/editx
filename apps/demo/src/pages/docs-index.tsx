import { Link } from "react-router";

const SECTIONS = [
  {
    title: "Image Editor",
    description: "The React component for image editing — crop, adjust, filter, text, shapes.",
    links: [
      { label: "Getting Started", href: "/docs/image-editor/getting-started" },
      { label: "Configuration", href: "/docs/image-editor/configuration" },
      { label: "API Reference", href: "/docs/image-editor/api" },
      { label: "Theming", href: "/docs/image-editor/theming" },
    ],
  },
  {
    title: "Engine",
    description: "The headless block-based engine — blocks, commands, undo/redo.",
    links: [
      { label: "Overview", href: "/docs/engine/overview" },
      { label: "Blocks", href: "/docs/engine/blocks" },
      { label: "Engine API", href: "/docs/engine/engine-api" },
      { label: "Block API", href: "/docs/engine/block-api" },
      { label: "Editor API", href: "/docs/engine/editor-api" },
      { label: "Scene & Events", href: "/docs/engine/scene-api" },
      { label: "Variable API", href: "/docs/engine/variable-api" },
      { label: "Plugin API", href: "/docs/engine/plugin-api" },
    ],
  },
];

export function DocsIndex() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-zinc-50/60 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-3">Documentation</h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg mb-10">
          Browse the docs for the image editor and engine packages.
        </p>
        <div className="flex flex-col gap-6">
          {SECTIONS.map((section) => (
            <div
              key={section.title}
              className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_-4px_rgba(0,0,0,0.07)] hover:shadow-[0_2px_8px_rgba(124,58,237,0.06),0_16px_40px_-8px_rgba(124,58,237,0.13)] hover:border-violet-200/60 dark:hover:border-violet-800/60 transition-all duration-300"
            >
              <h2 className="text-xl font-semibold mb-1">{section.title}</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">{section.description}</p>
              <div className="flex flex-wrap gap-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="px-3.5 py-1.5 rounded-lg text-sm bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 no-underline hover:bg-violet-50 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-400 transition-colors"
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
