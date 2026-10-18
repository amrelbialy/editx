import { type EditorHandle, ImageEditor, type ThemeConfig } from "@editx/image-editor";
import { useEffect, useMemo, useState } from "react";

interface Props {
  theme: ThemeConfig;
  onReady: (handle: EditorHandle) => void;
}

export function PagePlaygroundCanvas(props: Props) {
  const { theme, onReady } = props;

  const [source, setSource] = useState<HTMLCanvasElement | null>(null);

  const config = useMemo(
    () => ({
      theme,
      tools: [],
      defaultTool: null,
      ui: { showTitle: false, unsavedChangesWarning: false },
    }),
    [theme],
  );

  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    setSource(canvas);
  }, []);

  return (
    <section
      className="h-[520px] overflow-hidden rounded-xl border border-border bg-card @3xl/editor:h-[620px]"
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
