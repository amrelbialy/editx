import { type EditxEngine, FILL_COLOR, hexToColor } from "@editx/engine";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PageNavigationLayout } from "../src/config/config.types";
import { type EditorHandle, ImageEditor } from "../src/image-editor";
import type { PageNavigationHarness } from "./page-navigation.types";

const SAMPLES = [
  { name: "Cover", width: 480, height: 320, background: "#ffe4e6", marker: "#e11d48" },
  { name: "Poster", width: 320, height: 480, background: "#dcfce7", marker: "#16a34a" },
  { name: "Card", width: 240, height: 240, background: "#dbeafe", marker: "#2563eb" },
] as const;

function populate(engine: EditxEngine): number[] {
  const first = engine.scene.getCurrentPage();
  if (first === null) throw new Error("Fixture has no initial page");
  engine.block.setPageImageSrc(first, "");
  const ids = SAMPLES.map((sample, index) => {
    const page = index === 0 ? first : engine.scene.addPage(sample);
    engine.scene.setPageProperties(page, {
      name: sample.name,
      backgroundColor: hexToColor(sample.background),
    });
    const marker = engine.block.create("graphic");
    engine.block.appendChild(page, marker);
    engine.block.setShapeGeometry(marker, { type: "rect", cornerRadius: 0 });
    engine.block.setPosition(marker, 40, 40);
    engine.block.setSize(marker, 40, 40);
    engine.block.setColor(marker, FILL_COLOR, hexToColor(sample.marker));
    return page;
  });
  engine.scene.setActivePage(first);
  engine.clearHistory();
  engine.editor.fitToScreen(48);
  return ids;
}

export function PageNavigationFixture(props: {
  enabled?: boolean;
  width?: number;
  layout?: PageNavigationLayout;
}) {
  const { enabled = true, width = 640, layout = "vertical" } = props;

  const root = useRef<HTMLDivElement | null>(null);

  const [source, setSource] = useState<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  const onReady = useCallback((handle: EditorHandle) => {
    const engine = handle.engine;
    const ids = populate(engine);
    const harness: PageNavigationHarness = {
      engine,
      ids,
      samplePixel: async (pageId = engine.scene.getCurrentPage() ?? undefined) => {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        const canvas = root.current?.querySelector<HTMLCanvasElement>(".konvajs-content canvas");
        const context = canvas?.getContext("2d");
        if (!context || !canvas) throw new Error("Fixture canvas unavailable");
        const frame = pageId === undefined ? null : engine.editor.getPageViewBounds(pageId);
        const point = engine.editor.worldToScreen({
          x: (frame?.x ?? 0) + 60,
          y: (frame?.y ?? 0) + 60,
        });
        const ratio = canvas.width / Number.parseFloat(canvas.style.width);
        return [...context.getImageData(point.x * ratio, point.y * ratio, 1, 1).data];
      },
    };
    window.__pageNavigationHarness = harness;
    setReady(true);
  }, []);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLES[0].width;
    canvas.height = SAMPLES[0].height;
    setSource(canvas);
    return () => {
      delete window.__pageNavigationHarness;
    };
  }, []);

  return (
    <div ref={root} style={{ width, height: 600 }}>
      <output data-status={ready ? "ready" : "loading"} />
      {source && (
        <ImageEditor
          src={source}
          onReady={onReady}
          width="100%"
          height="100%"
          config={{
            tools: [],
            ui: { pageNavigation: enabled, pageLayout: layout, showTitle: false },
          }}
        />
      )}
    </div>
  );
}
