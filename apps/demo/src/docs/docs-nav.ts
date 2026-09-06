export type DocLink = { label: string; href: string };

export type DocGroup = {
  heading: string;
  description: string;
  links: DocLink[];
};

/**
 * Single source of truth for the docs navigation. Drives the sidebar, the
 * "previous / next" footer (flattened in order), and the docs index cards.
 */
export const DOCS_NAV: DocGroup[] = [
  {
    heading: "Image Editor",
    description: "The React component for image editing — crop, adjust, filter, text, shapes.",
    links: [
      { label: "Getting Started", href: "/docs/image-editor/getting-started" },
      { label: "Configuration", href: "/docs/image-editor/configuration" },
      { label: "API Reference", href: "/docs/image-editor/api" },
      { label: "Theming", href: "/docs/image-editor/theming" },
    ],
  },
  {
    heading: "Tool Configuration",
    description: "Tailor each built-in tool — the controls, presets, and defaults it exposes.",
    links: [
      { label: "Crop Tool", href: "/docs/image-editor/guides/configure-crop" },
      { label: "Adjust Tool", href: "/docs/image-editor/guides/configure-adjustments" },
      { label: "Filter Tool", href: "/docs/image-editor/guides/configure-filters" },
      { label: "Text Tool", href: "/docs/image-editor/guides/configure-fonts" },
      { label: "Shapes Tool", href: "/docs/image-editor/guides/configure-shapes" },
      { label: "Image Uploads", href: "/docs/image-editor/guides/image-upload-limits" },
    ],
  },
  {
    heading: "Toolbar & UI",
    description: "Choose which tools appear and extend the editor chrome with your own UI.",
    links: [
      { label: "Customize the Toolbar", href: "/docs/image-editor/guides/customize-toolbar" },
      { label: "Add a Custom Tool", href: "/docs/image-editor/guides/custom-tool" },
      { label: "Inject Custom UI", href: "/docs/image-editor/guides/inject-slots" },
      { label: "Customize the Chrome", href: "/docs/image-editor/guides/customize-chrome" },
    ],
  },
  {
    heading: "Theme & Localization",
    description: "Match your brand colors and speak your users' language.",
    links: [
      { label: "Customize the Theme", href: "/docs/image-editor/guides/custom-theme" },
      { label: "Localize the UI", href: "/docs/image-editor/guides/localize" },
    ],
  },
  {
    heading: "Saving & Events",
    description: "Control export output, transform the result, and react to editor events.",
    links: [
      { label: "Export & Save", href: "/docs/image-editor/guides/export-and-save" },
      { label: "React to Editor Events", href: "/docs/image-editor/guides/track-tool-changes" },
    ],
  },
  {
    heading: "Integrate Anywhere",
    description: "Drop the editor into any stack — a modal, plain DOM, or an HTML tag.",
    links: [
      { label: "Save & Restore Scenes", href: "/docs/image-editor/guides/save-load-scene" },
      { label: "Open in a Modal", href: "/docs/image-editor/guides/open-in-modal" },
      { label: "Mount Without React", href: "/docs/image-editor/guides/vanilla-mount" },
      { label: "Use as a Web Component", href: "/docs/image-editor/guides/web-component" },
    ],
  },
  {
    heading: "Engine",
    description: "The headless block-based engine — blocks, commands, undo/redo.",
    links: [
      { label: "Overview", href: "/docs/engine/overview" },
      { label: "Blocks", href: "/docs/engine/blocks" },
      { label: "Commands", href: "/docs/engine/commands" },
      { label: "Engine API", href: "/docs/engine/engine-api" },
      { label: "Block API", href: "/docs/engine/block-api" },
      { label: "Graphics API", href: "/docs/engine/graphics-api" },
      { label: "Text API", href: "/docs/engine/text-api" },
      { label: "Groups API", href: "/docs/engine/groups-api" },
      { label: "Editor API", href: "/docs/engine/editor-api" },
      { label: "Scene & Events", href: "/docs/engine/scene-api" },
    ],
  },
];

/** Flattened, ordered list of every doc link — powers previous/next navigation. */
export const DOCS_ORDER: DocLink[] = DOCS_NAV.flatMap((group) => group.links);

/** Resolve the previous/next doc links for a given pathname. */
export function getAdjacentDocs(pathname: string): {
  prev: DocLink | null;
  next: DocLink | null;
} {
  const index = DOCS_ORDER.findIndex((link) => link.href === pathname);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? DOCS_ORDER[index - 1] : null,
    next: index < DOCS_ORDER.length - 1 ? DOCS_ORDER[index + 1] : null,
  };
}
