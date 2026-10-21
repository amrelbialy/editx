import { type EditxEngine, hexToColor } from "@editx/engine";
import { createPostBuilder } from "./post-builder";
import { SOCIAL_POSTS } from "./social-posts";

function decoratePage(engine: EditxEngine, pageId: number, sample: (typeof SOCIAL_POSTS)[number]) {
  engine.scene.setPageProperties(pageId, {
    name: sample.name,
    width: sample.width,
    height: sample.height,
    backgroundColor: hexToColor(sample.background),
    metadata: { thumbnailAlt: `${sample.name} preview`, uiGroup: "Social posts" },
  });
  sample.build(createPostBuilder(engine, pageId));
}

export function seedPagePlayground(engine: EditxEngine): void {
  const first = engine.scene.getCurrentPage();
  if (first === null) throw new Error("The playground requires an initialized scene");
  engine.beginBatch();
  engine.beginSilent();
  try {
    engine.block.setPageImageSrc(first, "");
    for (const [index, sample] of SOCIAL_POSTS.entries()) {
      const id =
        index === 0 ? first : engine.scene.addPage({ width: sample.width, height: sample.height });
      decoratePage(engine, id, sample);
    }
    engine.block.deselectAll();
  } finally {
    engine.endSilent();
    engine.endBatch();
  }
  engine.scene.setActivePage(first);
  engine.clearHistory();
  engine.editor.fitToScreen(24);
}

export function addPlaygroundPage(engine: EditxEngine): void {
  engine.beginBatch();
  try {
    const sample = SOCIAL_POSTS[engine.scene.getPages().length % SOCIAL_POSTS.length];
    const page = engine.scene.addPage({ width: sample.width, height: sample.height });
    decoratePage(engine, page, sample);
    engine.block.deselectAll();
  } finally {
    engine.endBatch();
  }
}
