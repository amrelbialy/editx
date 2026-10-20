import { type EditxEngine, FILL_COLOR, hexToColor, TEXT_RUNS } from "@editx/engine";

const SAMPLES = [
  { name: "Cover", width: 800, height: 600, background: "#fff1f2", accent: "#e11d48" },
  { name: "Poster", width: 600, height: 800, background: "#dcfce7", accent: "#16a34a" },
  { name: "Card", width: 400, height: 400, background: "#dbeafe", accent: "#2563eb" },
] as const;

function decoratePage(engine: EditxEngine, pageId: number, sample: (typeof SAMPLES)[number]) {
  engine.scene.setPageProperties(pageId, {
    name: sample.name,
    backgroundColor: hexToColor(sample.background),
    metadata: { thumbnailAlt: `${sample.name} preview`, uiGroup: "Playground" },
  });
  const title = engine.block.create("text");
  engine.block.appendChild(pageId, title);
  engine.block.setPosition(title, 40, 35);
  engine.block.setSize(title, sample.width - 80, 60);
  engine.block.setProperty(title, TEXT_RUNS, [
    { text: sample.name, style: { fontSize: 36, fontFamily: "Arial", fill: "#172554" } },
  ]);
  const graphic = engine.block.create("graphic");
  engine.block.appendChild(pageId, graphic);
  engine.block.setShapeGeometry(graphic, { type: "rect", cornerRadius: 18 });
  engine.block.setPosition(graphic, 40, 120);
  engine.block.setSize(graphic, Math.min(240, sample.width - 80), 120);
  engine.block.setColor(graphic, FILL_COLOR, hexToColor(sample.accent));
  const caption = engine.block.create("text");
  engine.block.appendChild(pageId, caption);
  engine.block.setPosition(caption, 40, 270);
  engine.block.setSize(caption, sample.width - 80, 80);
  engine.block.setProperty(caption, TEXT_RUNS, [
    {
      text: `${sample.width} x ${sample.height}\nDrag the artwork, then resize or duplicate.`,
      style: { fontSize: 18, fontFamily: "Arial", fill: "#172554" },
    },
  ]);
  engine.block.setName(engine.block.group([graphic, caption]), `${sample.name} artwork`);
}

export function seedPagePlayground(engine: EditxEngine): void {
  const first = engine.scene.getCurrentPage();
  if (first === null) throw new Error("The playground requires an initialized scene");
  engine.beginBatch();
  engine.beginSilent();
  try {
    engine.block.setPageImageSrc(first, "");
    for (const [index, sample] of SAMPLES.entries()) {
      const id = index === 0 ? first : engine.scene.addPage(sample);
      decoratePage(engine, id, sample);
    }
    engine.block.deselectAll();
  } finally {
    engine.endSilent();
    engine.endBatch();
  }
  engine.scene.setActivePage(first);
  engine.clearHistory();
  engine.editor.fitToScreen(48);
}

export function addPlaygroundPage(engine: EditxEngine): void {
  engine.beginBatch();
  try {
    const sample = SAMPLES[engine.scene.getPages().length % SAMPLES.length];
    const page = engine.scene.addPage(sample);
    decoratePage(engine, page, sample);
    engine.block.deselectAll();
  } finally {
    engine.endBatch();
  }
}
