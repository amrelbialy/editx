import { useEffect } from "react";
import { useLocation } from "react-router";
import { DOCS_NAV } from "../docs/docs-nav";

const SITE_NAME = "Editx";
export const SITE_URL = "https://editx-sdk.vercel.app";
export const SOCIAL_IMAGE_URL = `${SITE_URL}/og-image.svg`;
const DEFAULT_DESCRIPTION =
  "Open-source image editor SDK for React, vanilla JavaScript, and Web Components. Crop, filter, annotate, theme, and extend it with a block-based engine.";

export interface PageMetadata {
  title: string;
  description: string;
  index?: boolean;
}

export interface ResolvedPageMetadata extends PageMetadata {
  canonicalUrl: string;
  robots: string;
}

const DOC_METADATA = new Map(
  DOCS_NAV.flatMap((group) =>
    group.links.map((link): [string, PageMetadata] => [
      link.href,
      {
        title: `${link.label} | Editx Docs`,
        description: `${link.label} documentation for Editx ${group.heading.toLowerCase()}. ${group.description}`,
      },
    ]),
  ),
);

const PAGE_METADATA = new Map<string, PageMetadata>([
  [
    "/",
    {
      title: "Editx | Open-Source Image Editor SDK",
      description: DEFAULT_DESCRIPTION,
    },
  ],
  [
    "/docs",
    {
      title: "Editx Documentation | Image Editor and Engine SDK",
      description:
        "Documentation, guides, and API references for the Editx image editor and block-based engine.",
    },
  ],
  [
    "/playground",
    {
      title: "Editx Image Editor Playground",
      description:
        "Try the Editx image editor SDK in an interactive playground and explore its themes and configuration.",
    },
  ],
  [
    "/demo",
    {
      title: "Editx Image Editor Demo",
      description:
        "Interactive Editx image editor demo for uploading, editing, and exporting an image.",
      index: false,
    },
  ],
  ...DOC_METADATA,
]);

export function getPageMetadata(pathname: string): ResolvedPageMetadata {
  const normalizedPath = pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
  const metadata = PAGE_METADATA.get(normalizedPath) ?? {
    title: `Page Not Found | ${SITE_NAME}`,
    description: DEFAULT_DESCRIPTION,
    index: false,
  };

  return {
    ...metadata,
    canonicalUrl: `${SITE_URL}${normalizedPath}`,
    robots: metadata.index === false ? "noindex, nofollow" : "index, follow",
  };
}

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}

export function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const metadata = getPageMetadata(pathname);

    document.title = metadata.title;
    setCanonical(metadata.canonicalUrl);
    setMeta('meta[name="description"]', "name", "description", metadata.description);
    setMeta('meta[name="robots"]', "name", "robots", metadata.robots);
    setMeta('meta[property="og:title"]', "property", "og:title", metadata.title);
    setMeta('meta[property="og:description"]', "property", "og:description", metadata.description);
    setMeta('meta[property="og:url"]', "property", "og:url", metadata.canonicalUrl);
    setMeta('meta[property="og:image"]', "property", "og:image", SOCIAL_IMAGE_URL);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", metadata.title);
    setMeta(
      'meta[name="twitter:description"]',
      "name",
      "twitter:description",
      metadata.description,
    );
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", SOCIAL_IMAGE_URL);
  }, [pathname]);

  return null;
}
