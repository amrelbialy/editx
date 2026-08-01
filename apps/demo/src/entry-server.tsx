import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router";
import { getPageMetadata } from "./components/seo";
import { DOCS_ORDER } from "./docs/docs-nav";
import { Site } from "./site";

export const prerenderRoutes = [
  "/",
  "/playground",
  "/demo",
  "/docs",
  ...DOCS_ORDER.map((link) => link.href),
];

export function render(pathname: string) {
  const html = renderToString(
    <StaticRouter location={pathname}>
      <Site />
    </StaticRouter>,
  );

  return {
    html,
    metadata: getPageMetadata(pathname),
  };
}
