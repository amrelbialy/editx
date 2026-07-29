// Renders the interactive status Tree tab for the dashboard.
// Source of truth: docs-private/feature-tree.json (read in dashboard.mjs).

export const TREE_STATUS = {
  idea: { icon: "\uD83D\uDCA1", label: "Idea", color: "#c084fc" },
  planned: { icon: "\uD83D\uDCCB", label: "Planned", color: "#94a3b8" },
  "in-progress": { icon: "\uD83D\uDEA7", label: "In progress", color: "#fbbf24" },
  shipped: { icon: "\u2705", label: "Shipped", color: "#34d399" },
  parked: { icon: "\uD83E\uDDCA", label: "Parked", color: "#38bdf8" },
  dropped: { icon: "\u274C", label: "Dropped", color: "#f87171" },
};

const meta = (s) => TREE_STATUS[s] ?? TREE_STATUS.idea;

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

/** Count every status across a subtree. */
function tally(node, acc = {}) {
  if (node.status) acc[node.status] = (acc[node.status] ?? 0) + 1;
  for (const c of node.children ?? []) tally(c, acc);
  return acc;
}

function rowLabel(node) {
  const m = node.status ? meta(node.status) : null;
  const dot = m ? `<span class="dot" style="background:${m.color};color:${m.color}"></span>` : "";
  const where = node.where ? `<code class="where">${esc(node.where)}</code>` : "";
  const note = node.note ? `<span class="note">${esc(node.note)}</span>` : "";
  return `${dot}<span class="nm">${esc(node.label)}</span>${where}${note}`;
}

function renderNode(node) {
  const kids = node.children ?? [];
  if (!kids.length) {
    return `<div class="leaf node" data-text="${esc(node.label.toLowerCase())}">${rowLabel(node)}</div>`;
  }
  const counts = tally(node);
  const pills = Object.keys(TREE_STATUS)
    .filter((s) => counts[s])
    .map((s) => `<span class="pill" style="--c:${meta(s).color}" title="${meta(s).label}">${meta(s).icon} ${counts[s]}</span>`)
    .join("");
  return `<details open class="node"><summary data-text="${esc(node.label.toLowerCase())}">
      <span class="lbl">${rowLabel(node)}</span><span class="pills">${pills}</span></summary>
      <div class="kids">${kids.map(renderNode).join("")}</div></details>`;
}

/** Build the Tree tab inner HTML (legend + roots). */
export function renderTree(tree) {
  if (!tree) return `<p class="meta">No <code>feature-tree.json</code> in docs-private/.</p>`;
  const total = tally(tree);
  const legend = Object.keys(TREE_STATUS)
    .map((s) => `<span class="leg"><span class="dot" style="background:${meta(s).color};color:${meta(s).color}"></span>${meta(s).label} <b>${total[s] ?? 0}</b></span>`)
    .join("");
  const roots = (tree.children ?? []).map(renderNode).join("");
  return `<div class="tree"><div class="legend">${legend}</div>${roots}</div>`;
}

export const TREE_CSS = `
.tree{max-width:1080px;margin:32px auto}
.legend{display:flex;flex-wrap:wrap;gap:12px 24px;margin-bottom:26px;color:#94a3b8;font-size:15px}
.leg{display:inline-flex;align-items:center;gap:8px}.leg b{color:#e2e8f0}
.tree details{border:1px solid #1e293b;border-radius:12px;background:rgba(17,24,38,.55);margin:12px 0;overflow:hidden}
.tree details .kids{padding:10px 14px 14px 32px}
.tree details .kids details{background:#0b0f17}
.tree summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:14px;padding:17px 20px;user-select:none}
.tree summary::-webkit-details-marker{display:none}
.tree summary::before{content:"\u25B8";color:#475569;transition:transform .15s ease;font-size:14px}
.tree details[open]>summary::before{transform:rotate(90deg)}
.tree .lbl{display:flex;align-items:center;gap:14px;flex:1;min-width:0}
.tree .pills{display:flex;gap:8px;flex-wrap:wrap}
.tree .pill{font-size:14px;color:var(--c);border:1px solid color-mix(in srgb,var(--c) 40%,transparent);border-radius:999px;padding:3px 11px;background:color-mix(in srgb,var(--c) 12%,transparent)}
.tree .leaf{display:flex;align-items:center;gap:14px;padding:15px 18px;margin:10px 0;background:#0b0f17;border:1px solid #1e293b;border-radius:9px}
.tree .nm{font-size:16px}
.tree .where{font-size:14px;color:#64748b;background:#1e293b}
.tree .note{font-size:15px;color:#94a3b8;font-style:italic;margin-left:4px}
.tree .leaf .dot,.tree summary .dot{box-shadow:0 0 8px 0 currentColor}
`;

export const TREE_JS = `
function filterTree(q) {
  const tree = document.querySelector(".tree");
  if (!tree) return;
  const leaves = tree.querySelectorAll(".leaf");
  for (const l of leaves) {
    const hit = !q || l.dataset.text.includes(q);
    l.style.display = hit ? "" : "none";
  }
  for (const d of tree.querySelectorAll("details")) {
    const own = !q || d.querySelector("summary").dataset.text.includes(q);
    const anyLeaf = [...d.querySelectorAll(".leaf")].some((l) => l.style.display !== "none");
    const show = own || anyLeaf;
    d.style.display = show ? "" : "none";
    if (q && show) d.open = true;
  }
}
`;
