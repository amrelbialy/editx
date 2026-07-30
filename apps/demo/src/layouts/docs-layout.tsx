import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";

type NavLink = { label: string; href: string };
type NavSection = { heading: string; links: NavLink[] };
type NavGroup = { heading: string; links?: NavLink[]; sections?: NavSection[] };

const SIDEBAR: NavGroup[] = [
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
    heading: "Guides",
    sections: [
      {
        heading: "Customize the Editor",
        links: [
          { label: "Limit the Tools", href: "/docs/image-editor/guides/limit-tools" },
          { label: "Configure the Crop Tool", href: "/docs/image-editor/guides/configure-crop" },
          {
            label: "Configure the Adjust Tool",
            href: "/docs/image-editor/guides/configure-adjustments",
          },
          {
            label: "Configure the Filter Tool",
            href: "/docs/image-editor/guides/configure-filters",
          },
          { label: "Configure Text Fonts", href: "/docs/image-editor/guides/configure-fonts" },
          {
            label: "Configure the Shapes Tool",
            href: "/docs/image-editor/guides/configure-shapes",
          },
          {
            label: "Configure Crop Aspect Ratios",
            href: "/docs/image-editor/guides/configure-crop-ratios",
          },
          { label: "Limit Image Uploads", href: "/docs/image-editor/guides/image-upload-limits" },
          { label: "Set the Default Tool", href: "/docs/image-editor/guides/set-default-tool" },
          {
            label: "Compact the Tool Sidebar",
            href: "/docs/image-editor/guides/compact-sidebar",
          },
          { label: "Add a Custom Tool", href: "/docs/image-editor/guides/custom-tool" },
          { label: "Inject Custom UI", href: "/docs/image-editor/guides/inject-slots" },
          { label: "Customize the Chrome", href: "/docs/image-editor/guides/customize-chrome" },
        ],
      },
      {
        heading: "Theme & Localize",
        links: [
          { label: "Customize the Theme", href: "/docs/image-editor/guides/custom-theme" },
          { label: "Localize the UI", href: "/docs/image-editor/guides/localize" },
        ],
      },
      {
        heading: "Export & Events",
        links: [
          { label: "Control Export Formats", href: "/docs/image-editor/guides/export-formats" },
          { label: "Add a Watermark on Save", href: "/docs/image-editor/guides/watermark-on-save" },
          { label: "Save & Close", href: "/docs/image-editor/guides/save-and-close" },
          { label: "React to Editor Events", href: "/docs/image-editor/guides/track-tool-changes" },
        ],
      },
      {
        heading: "Integrate Anywhere",
        links: [
          { label: "Save & Restore Scenes", href: "/docs/image-editor/guides/save-load-scene" },
          { label: "Open in a Modal", href: "/docs/image-editor/guides/open-in-modal" },
          { label: "Mount Without React", href: "/docs/image-editor/guides/vanilla-mount" },
          { label: "Use as a Web Component", href: "/docs/image-editor/guides/web-component" },
        ],
      },
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
    ],
  },
];

const linkClass = (active: boolean) =>
  `block px-2.5 py-1.5 rounded-md text-sm no-underline transition-colors ${
    active
      ? "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium"
      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
  }`;

function NavLinks(props: { links: NavLink[]; pathname: string }) {
  const { links, pathname } = props;
  return (
    <ul className="flex flex-col gap-1">
      {links.map((link) => (
        <li key={link.href}>
          <Link to={link.href} className={linkClass(pathname === link.href)}>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AccordionSection(props: { section: NavSection; pathname: string }) {
  const { section, pathname } = props;
  const containsActive = section.links.some((l) => l.href === pathname);

  const [open, setOpen] = useState(containsActive);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 rounded-md px-1 py-1 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        <ChevronRight
          className={`size-3.5 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
        {section.heading}
      </button>
      {open && (
        <div className="mt-1 pl-2">
          <NavLinks links={section.links} pathname={pathname} />
        </div>
      )}
    </div>
  );
}

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
              {group.links && <NavLinks links={group.links} pathname={pathname} />}
              {group.sections && (
                <div className="flex flex-col gap-2">
                  {group.sections.map((section) => (
                    <AccordionSection key={section.heading} section={section} pathname={pathname} />
                  ))}
                </div>
              )}
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
