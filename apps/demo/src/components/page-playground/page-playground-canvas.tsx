import {
  type EditorHandle,
  ImageEditor,
  type PageNavigationLayout,
  type ThemeConfig,
} from "@editx/image-editor";
import { useEffect, useMemo, useState } from "react";

interface Props {
  theme: ThemeConfig;
  onReady: (handle: EditorHandle) => void;
  layout: PageNavigationLayout;
}

export function PagePlaygroundCanvas(props: Props) {
  const { theme, onReady, layout } = props;

  const [source, setSource] = useState<HTMLCanvasElement | null>(null);

  const config = useMemo(
    () => ({
      theme,
      tools: [],
      defaultTool: null,
      export: { filename: "studio-posts" },
      ui: {
        showTitle: false,
        unsavedChangesWarning: false,
        pageNavigation: true,
        pageLayout: layout,
      },
    }),
    [theme, layout],
  );

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    setSource(canvas);
  }, []);

  return (
    <section
      className="h-[640px] overflow-hidden rounded-xl border border-border bg-card @3xl/editor:h-[720px]"
      aria-label="Multi-page canvas"
    >
      {source ? (
        <ImageEditor src={source} config={config} onReady={onReady} width="100%" height="100%" />
      ) : (
        <p className="p-3 text-sm text-muted-foreground" role="status">
          Preparing the canvas...
        </p>
      )}
    </section>
  );
}
