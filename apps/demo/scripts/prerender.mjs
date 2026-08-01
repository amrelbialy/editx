import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const appRoot = process.cwd();
const distDir = path.resolve(appRoot, "dist");
const serverDir = path.resolve(appRoot, "dist-ssr");
const serverEntry = path.resolve(serverDir, "entry-server.js");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceMeta(html, attribute, key, content) {
  const pattern = new RegExp(
    `<meta\\s+${attribute}="${key}"\\s+content="[^"]*"\\s*\\/?>`,
  );
  const replacement = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;

  if (!pattern.test(html)) {
    throw new Error(`Missing ${attribute}="${key}" metadata tag in index.html`);
  }
  return html.replace(pattern, replacement);
}

function applyMetadata(template, metadata) {
  let html = template.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(metadata.title)}</title>`);
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl)}" />`,
  );
  html = replaceMeta(html, "name", "description", metadata.description);
  html = replaceMeta(html, "name", "robots", metadata.robots);
  html = replaceMeta(html, "property", "og:title", metadata.title);
  html = replaceMeta(html, "property", "og:description", metadata.description);
  html = replaceMeta(html, "property", "og:url", metadata.canonicalUrl);
  html = replaceMeta(html, "name", "twitter:title", metadata.title);
  html = replaceMeta(html, "name", "twitter:description", metadata.description);
  return html;
}

function applyBody(template, body) {
  const root = '<div id="root"></div>';
  if (!template.includes(root)) {
    throw new Error("Missing empty root element in built index.html");
  }
  return template.replace(root, `<div id="root">${body}</div>`);
}

async function writeRoute(route, html) {
  const outputDir = route === "/" ? distDir : path.join(distDir, route.slice(1));
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, "index.html"), html);
}

try {
  const template = await readFile(path.join(distDir, "index.html"), "utf8");
  const { prerenderRoutes, render } = await import(pathToFileURL(serverEntry).href);

  for (const route of prerenderRoutes) {
    const { html: body, metadata } = render(route);
    await writeRoute(route, applyBody(applyMetadata(template, metadata), body));
  }

  const notFound = render("/404");
  const notFoundHtml = applyBody(applyMetadata(template, notFound.metadata), notFound.html);
  await writeFile(path.join(distDir, "404.html"), notFoundHtml);

  console.info(`Prerendered ${prerenderRoutes.length} routes and 404.html`);
} finally {
  await rm(serverDir, { recursive: true, force: true });
}
