import { FOCUS_CSS, renderFocus } from "./dashboard-focus.mjs";
import { renderTree, TREE_CSS, TREE_JS, TREE_STATUS } from "./dashboard-tree.mjs";

// Board uses the same six statuses as the Tree, rendered in this order.
const STATUS_META = TREE_STATUS;
const ORDER = ["in-progress", "idea", "planned", "parked", "shipped", "dropped"];

/** Count features by status. */
export function tally(features) {
  const counts = {};
  for (const k of Object.keys(STATUS_META)) counts[k] = 0;
  for (const f of features) counts[f.status] = (counts[f.status] ?? 0) + 1;
  return counts;
}

/** Build the markdown block that replaces the AUTO section in DASHBOARD.md. */
export function renderMarkdown(features, metrics, now) {
  const counts = tally(features);
  const rows = features
    .map((f) => {
      const m = STATUS_META[f.status] ?? STATUS_META.planned;
      return `| ${m.icon} | \`${f.stem}\` | ${f.title} |`;
    })
    .join("\n");

  const commits = metrics.commits
    .map((c) => `- \`${c.hash}\` ${c.subject} _(${c.when})_`)
    .join("\n");

  return [
    `_Last generated: ${now.toISOString()} — do not edit this section by hand (run \`pnpm dashboard\`)._`,
    "",
    "### Repo snapshot",
    "",
    `- **Branch:** \`${metrics.branch}\``,
    `- **Uncommitted files:** ${metrics.dirty}`,
    `- **Recipes:** ${metrics.recipeDocs} docs / ${metrics.recipeSpecs} specs`,
    `- **Tests:** ${metrics.engineTests} engine · ${metrics.ieTests} image-editor`,
    "",
    "### Feature status",
    "",
    ORDER.filter((s) => counts[s]).map((s) => `${STATUS_META[s].icon} ${counts[s]} ${STATUS_META[s].label.toLowerCase()}`).join(" · "),
    "",
    "|  | Doc | Feature |",
    "|---|---|---|",
    rows,
    "",
    "### Recent commits",
    "",
    commits || "_(none)_",
  ].join("\n");
}

/** Build the standalone, self-contained HTML dashboard page. */
export function renderHtml(features, metrics, now, featureMapMd = "", tree = null, focus = null) {
  const counts = tally(features);
  const card = (f) => {
    const m = STATUS_META[f.status] ?? STATUS_META.planned;
    return `<li class="row"><span class="dot" style="background:${m.color}"></span>
      <span class="stem">${f.stem}</span><span class="title">${esc(f.title)}</span></li>`;
  };
  const col = (status) =>
    `<section class="col" style="--accent:${STATUS_META[status].color}"><h2><span class="dot" style="background:${STATUS_META[status].color};color:${STATUS_META[status].color}"></span>
      ${STATUS_META[status].label} <em>${counts[status]}</em></h2>
      <ul>${features.filter((f) => f.status === status).map(card).join("") || '<li class="empty">—</li>'}</ul></section>`;

  const commits = metrics.commits
    .map((c) => `<li><code>${c.hash}</code> ${esc(c.subject)} <span class="when">${esc(c.when)}</span></li>`)
    .join("");

  const pct = features.length ? Math.round((counts.shipped / features.length) * 100) : 0;

  const tiles = [
    { n: `${counts.shipped}/${features.length}`, l: "Features shipped" },
    { n: metrics.recipeDocs, l: "Recipes" },
    { n: metrics.engineTests + metrics.ieTests, l: "Test files" },
    { n: metrics.dirty, l: "Uncommitted" },
  ]
    .map((t) => `<div class="tile"><span class="n">${t.n}</span><span class="l">${t.l}</span></div>`)
    .join("");

  // Embed the raw feature-map markdown; it is rendered client-side (marked + mermaid).
  // Escape closing-script sequences so it can live safely inside a <script> tag.
  const mapSrc = featureMapMd.replace(/<\/(script)/gi, "<\\/$1");
  const mapView = featureMapMd
    ? `<div id="feature-map" class="md">Rendering…</div>
       <script type="text/plain" id="feature-map-src">${mapSrc}</script>`
    : `<p class="meta">No <code>FEATURE_MAP.md</code> found in docs-private/.</p>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Editx — Mission Control</title><style>${CSS}</style></head>
<body><header>
<div class="head-row">
<h1>Editx <span class="sub">Mission Control</span></h1>
<div class="ring" style="--pct:${pct}"><span>${pct}%</span></div>
</div>
<p class="meta">Branch <code>${metrics.branch}</code> · generated ${now.toLocaleString()}</p>
<div class="tiles">${tiles}</div>
<nav class="tabs">
<button data-tab="focus" class="active">Focus</button>
<button data-tab="board">Board</button>
<button data-tab="tree">Tree</button>
<button data-tab="map">Feature map</button>
<input id="filter" type="search" placeholder="Filter…" />
</nav>
</header>
<div id="view-focus">${renderFocus(focus)}</div>
<div id="view-board" class="hidden">
<main class="board">${ORDER.filter((s) => counts[s] > 0).map(col).join("")}</main>
<section class="commits"><h2>Recent commits</h2><ul>${commits || "<li>(none)</li>"}</ul></section>
</div>
<div id="view-tree" class="hidden">${renderTree(tree)}</div>
<div id="view-map" class="hidden">${mapView}</div>
<footer>Run <code>pnpm dashboard</code> to refresh. Local-only — not shipped.</footer>
<script type="module">${CLIENT_JS}</script>
</body></html>`;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

// Client-side: tab switching + lazy markdown/mermaid render of the feature map.
const CLIENT_JS = `
const tabs = document.querySelectorAll("[data-tab]");
const views = { focus: document.getElementById("view-focus"), board: document.getElementById("view-board"), tree: document.getElementById("view-tree"), map: document.getElementById("view-map") };
let mapDone = false;
async function renderMap() {
  if (mapDone) return; mapDone = true;
  const src = document.getElementById("feature-map-src");
  if (!src) return;
  const el = document.getElementById("feature-map");
  try {
    const [{ marked }, mermaidMod] = await Promise.all([
      import("https://cdn.jsdelivr.net/npm/marked@12/lib/marked.esm.js"),
      import("https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs"),
    ]);
    const mermaid = mermaidMod.default;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "base",
      themeVariables: {
        darkMode: true,
        background: "#0b0f17",
        primaryColor: "#1e293b",
        primaryBorderColor: "#7c3aed",
        primaryTextColor: "#e2e8f0",
        lineColor: "#475569",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      },
    });
    el.innerHTML = marked.parse(src.textContent);
    el.querySelectorAll("code.language-mermaid").forEach((c) => {
      const pre = document.createElement("pre");
      pre.className = "mermaid";
      pre.textContent = c.textContent;
      c.closest("pre").replaceWith(pre);
    });
    await mermaid.run({ querySelector: ".mermaid" });
  } catch (e) {
    el.textContent = "Could not render feature map (offline?). " + e;
  }
}
for (const t of tabs) t.addEventListener("click", () => {
  for (const x of tabs) x.classList.toggle("active", x === t);
  for (const k of Object.keys(views)) views[k].classList.toggle("hidden", k !== t.dataset.tab);
  if (t.dataset.tab === "map") renderMap();
});
const filter = document.getElementById("filter");
if (filter) filter.addEventListener("input", () => {
  const q = filter.value.trim().toLowerCase();
  for (const row of document.querySelectorAll(".board .row")) {
    row.style.display = row.textContent.toLowerCase().includes(q) ? "" : "none";
  }
  for (const it of document.querySelectorAll(".focus .fitem")) {
    const t = it.querySelector(".ftext");
    it.style.display = t && t.dataset.text.includes(q) ? "" : "none";
  }
  filterTree(q);
});
${TREE_JS}
`;

const CSS = `
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;font:17px/1.75 ui-sans-serif,system-ui,-apple-system,sans-serif;color:#e2e8f0;
  background:radial-gradient(1200px 600px at 80% -10%,rgba(124,58,237,.18),transparent 60%),
             radial-gradient(900px 500px at -10% 10%,rgba(16,185,129,.10),transparent 55%),#0b0f17;
  padding:52px clamp(28px,4vw,72px);min-height:100vh}
header{max-width:1100px;margin:0 auto}
.head-row{display:flex;align-items:center;gap:20px}
h1{font-size:36px;font-weight:800;margin:0;letter-spacing:-.02em;
  background:linear-gradient(135deg,#a78bfa,#6366f1 45%,#34d399);-webkit-background-clip:text;background-clip:text;color:transparent}
h1 .sub{font-weight:600;color:#64748b;-webkit-text-fill-color:#64748b}
.meta{color:#64748b;margin:8px 0}
code{background:#1e293b;border-radius:5px;padding:2px 8px;font-size:14px}
.ring{margin-left:auto;width:86px;height:86px;border-radius:50%;display:grid;place-items:center;flex:0 0 auto;
  background:conic-gradient(#34d399 calc(var(--pct)*1%),#1e293b 0)}
.ring span{width:64px;height:64px;border-radius:50%;background:#0b0f17;display:grid;place-items:center;font-size:17px;font-weight:700}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin:28px 0 4px}
.tile{background:rgba(17,24,38,.7);border:1px solid #1e293b;border-radius:14px;padding:22px 24px;backdrop-filter:blur(6px)}
.tile .n{display:block;font-size:34px;font-weight:800;letter-spacing:-.02em}
.tile .l{display:block;color:#64748b;font-size:14px;margin-top:6px}
.tabs{display:flex;align-items:center;gap:8px;margin-top:32px;border-bottom:1px solid #1e293b}
.tabs button{font:inherit;font-size:17px;cursor:pointer;border:0;background:transparent;color:#94a3b8;padding:14px 22px;position:relative}
.tabs button.active{color:#e2e8f0}
.tabs button.active::after{content:"";position:absolute;left:14px;right:14px;bottom:-1px;height:3px;border-radius:3px;
  background:linear-gradient(90deg,#8b5cf6,#34d399)}
.tabs #filter{margin-left:auto;background:#111826;border:1px solid #1e293b;border-radius:9px;color:#e2e8f0;
  padding:11px 16px;font:inherit;font-size:16px;width:280px}
#view-board,#view-map{max-width:1100px;margin:0 auto}
#view-focus{max-width:1100px;margin:0 auto}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;display:flex;align-items:center;gap:8px;margin:0 0 18px}
h2 em{margin-left:auto;font-style:normal;color:#e2e8f0;background:#1e293b;border-radius:999px;padding:3px 13px;font-size:14px}
.board{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:28px;margin:36px 0}
.col{position:relative;background:rgba(17,24,38,.7);border:1px solid #1e293b;border-radius:16px;padding:28px;backdrop-filter:blur(6px);overflow:hidden}
.col::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:var(--accent,#475569)}
.col ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.row{display:flex;align-items:center;gap:13px;background:#0b0f17;border:1px solid #1e293b;border-radius:10px;
  padding:15px 17px;transition:transform .12s ease,border-color .12s ease}
.row:hover{transform:translateY(-1px);border-color:#334155}
.dot{width:11px;height:11px;border-radius:50%;flex:0 0 auto;box-shadow:0 0 10px 1px currentColor}
.stem{font-family:ui-monospace,monospace;font-size:13px;color:#64748b}
.title{font-size:16px}
.empty{color:#475569}
.commits{background:rgba(17,24,38,.7);border:1px solid #1e293b;border-radius:16px;padding:28px;margin-bottom:32px}
.commits ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px}
.commits li{padding:12px 0;border-bottom:1px solid #1e293b}.commits li:last-child{border:0}
.commits .when{color:#64748b;font-size:14px;margin-left:6px}
footer{max-width:1100px;margin:0 auto;color:#475569;font-size:12px;text-align:center;padding-top:8px}
.hidden{display:none}
.md{background:rgba(17,24,38,.7);border:1px solid #1e293b;border-radius:16px;padding:38px 44px;margin:32px auto;max-width:1020px;overflow-x:auto;font-size:17px}
.md h1{font-size:29px}.md h2{font-size:22px;text-transform:none;letter-spacing:0;color:#e2e8f0;margin:32px 0 14px;border-bottom:1px solid #1e293b;padding-bottom:10px;display:block}
.md h3{font-size:18px;color:#cbd5e1;margin:22px 0 10px}
.md a{color:#a78bfa;text-decoration:none}.md a:hover{text-decoration:underline}
.md hr{border:0;border-top:1px solid #1e293b;margin:28px 0}
.md blockquote{border-left:4px solid #7c3aed;margin:16px 0;padding:8px 20px;color:#94a3b8;background:#0b0f17;border-radius:0 8px 8px 0}
.md pre{background:#0b0f17;border:1px solid #1e293b;border-radius:10px;padding:20px;overflow-x:auto}
.md pre.mermaid{background:transparent;border:0;text-align:center}
.md code{font-size:14px}
.md table{border-collapse:collapse;width:100%;margin:18px 0;font-size:15px}
.md th,.md td{border:1px solid #1e293b;padding:11px 15px;text-align:left;vertical-align:top}
.md th{background:#0b0f17;color:#cbd5e1}
.md tr:hover td{background:rgba(124,58,237,.05)}
html{scroll-behavior:smooth}
${FOCUS_CSS}
${TREE_CSS}
`;
