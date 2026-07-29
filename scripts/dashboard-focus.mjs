// Renders the hand-written Now / Next / Later checklists (from DASHBOARD.md)
// as a "Focus" panel in the HTML dashboard.

const COLUMNS = [
  { key: "now", label: "Now", hint: "actively working", accent: "#fbbf24" },
  { key: "next", label: "Next", hint: "queued", accent: "#c084fc" },
  { key: "later", label: "Later", hint: "someday / maybe", accent: "#38bdf8" },
];

function esc(s) {
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
}

/** Minimal inline markdown: **bold** and `code`. */
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function item(it) {
  const cls = it.done ? "fitem done" : "fitem";
  const box = it.done ? "✓" : "";
  return `<li class="${cls}"><span class="box">${box}</span><span class="ftext" data-text="${esc(
    it.text.toLowerCase(),
  )}">${inline(it.text)}</span></li>`;
}

/** Build the Focus view from { now, next, later } (or null). */
export function renderFocus(focus) {
  if (!focus) {
    return `<p class="meta">No <code>DASHBOARD.md</code> found in docs-private/.</p>`;
  }
  const cols = COLUMNS.map((c) => {
    const items = focus[c.key] ?? [];
    const body = items.length ? items.map(item).join("") : '<li class="fempty">—</li>';
    return `<section class="fcol" style="--accent:${c.accent}">
      <h2><span class="dot" style="background:${c.accent};color:${c.accent}"></span>${c.label}
      <span class="fhint">${c.hint}</span><em>${items.length}</em></h2>
      <ul>${body}</ul></section>`;
  }).join("");
  return `<main class="focus">${cols}</main>`;
}

export const FOCUS_CSS = `
.focus{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:28px;margin:36px 0}
.fcol{position:relative;background:rgba(17,24,38,.7);border:1px solid #1e293b;border-radius:16px;padding:28px;backdrop-filter:blur(6px);overflow:hidden}
.fcol::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:var(--accent,#475569)}
.fcol h2{font-size:15px}
.fcol h2 .fhint{font-weight:400;text-transform:none;letter-spacing:0;color:#64748b;font-size:13px;margin-left:2px}
.fcol ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px}
.fitem{display:flex;align-items:flex-start;gap:13px;background:#0b0f17;border:1px solid #1e293b;border-radius:10px;
  padding:15px 17px;font-size:16px;line-height:1.55;transition:transform .12s ease,border-color .12s ease}
.fitem:hover{transform:translateY(-1px);border-color:#334155}
.fitem .box{flex:0 0 auto;width:19px;height:19px;border:2px solid #334155;border-radius:6px;margin-top:1px;
  display:grid;place-items:center;font-size:13px;color:#34d399}
.fitem.done{opacity:.55}
.fitem.done .ftext{text-decoration:line-through;color:#64748b}
.fitem.done .box{border-color:#34d399;background:rgba(52,211,153,.12)}
.ftext strong{color:#f1f5f9}
.fempty{color:#475569}
`;
