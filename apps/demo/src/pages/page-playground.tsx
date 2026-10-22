import {
  Button,
  downloadBlob,
  type EditorHandle,
  type PageNavigationLayout,
  SegmentedControl,
  ThemeProvider,
} from "@editx/image-editor";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import { PagePlaygroundCanvas } from "../components/page-playground/page-playground-canvas";
import { PagePlaygroundControls } from "../components/page-playground/page-playground-controls";
import { PagePlaygroundDiagnostics } from "../components/page-playground/page-playground-diagnostics";
import { seedPagePlayground } from "../components/page-playground/page-playground-scene";
import { usePageObservations } from "../components/page-playground/use-page-observations";
import { useDarkMode } from "../hooks/use-dark-mode";

export function PagePlayground() {
  const [dark] = useDarkMode();
  const { engine, setEngine, snapshot, events, record, refresh } = usePageObservations();

  const [version, setVersion] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [layout, setLayout] = useState<PageNavigationLayout>("vertical");

  const theme = useMemo(() => ({ preset: dark ? ("dark" as const) : ("light" as const) }), [dark]);
  const run = useCallback(
    async (label: string, action: () => unknown) => {
      setBusy(true);
      setError(null);
      try {
        await action();
        record("action", label);
      } catch (cause) {
        const message = `${label}: ${cause instanceof Error ? cause.message : String(cause)}`;
        setError(message);
        record("error", message);
      } finally {
        refresh();
        setBusy(false);
      }
    },
    [record, refresh],
  );
  const ready = useCallback(
    (handle: EditorHandle) => {
      try {
        seedPagePlayground(handle.engine);
        setEngine(handle.engine);
      } catch (cause) {
        setError(
          `Playground initialization: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
    },
    [setEngine],
  );
  const reset = useCallback(() => {
    setEngine(null);
    setSaved(null);
    setError(null);
    setVersion((value) => value + 1);
  }, [setEngine]);

  return (
    <ThemeProvider theme={theme}>
      <main className="@container/editor mx-auto flex max-w-[1600px] flex-col gap-3 p-3 text-foreground">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Multi-page SDK playground</h1>
            <p className="text-sm text-muted-foreground">
              Three original, editable social posts / no external images or fonts.
            </p>
          </div>
          <Link to="/playground" className="text-sm text-primary underline">
            Single-image playground
          </Link>
        </header>
        <p
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm"
          role="note"
        >
          Try Slow Mornings, Open Studio, and Weekend Reset: square and portrait posts with editable
          text, shapes, and grouped illustrations. Double-click text to edit it, or select artwork
          to change its styling. Save snapshot / Load saved snapshot keeps the editable document in
          memory; Download JSON saves all three editable posts to a file. Export Image saves the
          current post as an image, or selected/all posts as an ordered ZIP at their original sizes.
          Choose a post in the side list to bring it into view. The side controls remain SDK
          diagnostics.
        </p>
        <p className="text-sm text-muted-foreground" role="note">
          Save Project downloads an editable .editx archive with a PNG preview. Open Project reopens
          it. Images and fonts are referenced, not embedded; archives are not yet self-contained.
        </p>
        <SegmentedControl
          ariaLabel="Canvas page layout"
          className="w-64"
          value={layout}
          onValueChange={setLayout}
          options={[
            { value: "vertical", label: "Vertical pages" },
            { value: "horizontal", label: "Horizontal pages" },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !snapshot?.canUndo}
            onClick={() => engine && void run("Undo", () => engine.undo())}
          >
            Undo change
          </Button>
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !snapshot?.canRedo}
            onClick={() => engine && void run("Redo", () => engine.redo())}
          >
            Redo change
          </Button>
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !engine}
            onClick={() =>
              engine && void run("Fit active page", () => engine.editor.fitToScreen(24))
            }
          >
            Fit active page
          </Button>
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !engine}
            onClick={() =>
              engine && void run("Save snapshot", () => setSaved(engine.document.saveToString()))
            }
          >
            Save snapshot
          </Button>
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !engine || !saved}
            onClick={() =>
              engine &&
              saved &&
              void run("Load saved snapshot", async () => {
                await engine.document.loadFromString(saved);
                engine.editor.fitToScreen(24);
              })
            }
          >
            Load saved snapshot
          </Button>
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !engine}
            onClick={() =>
              engine &&
              void run("Download JSON", () =>
                downloadBlob(
                  new Blob([engine.document.saveToString()], { type: "application/json" }),
                  "studio-posts.editx",
                ),
              )
            }
          >
            Download JSON
          </Button>
          <Button className="px-2" variant="outline" disabled={busy} onClick={reset}>
            Reset sample
          </Button>
        </div>
        {error && (
          <p role="alert" className="rounded-lg border border-destructive p-3 text-sm">
            {error}
          </p>
        )}
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {snapshot
            ? `${snapshot.pages.length} pages / Active ID: ${snapshot.activePageId} / Top page ID: ${snapshot.topPageId} / Selected: ${snapshot.selection.join(", ") || "none"}`
            : "Initializing SDK..."}
          {saved && " / Snapshot saved in memory"}
        </p>
        <div className="grid min-w-0 gap-3 @3xl/editor:grid-cols-[minmax(0,1fr)_22rem]">
          <PagePlaygroundCanvas key={version} theme={theme} onReady={ready} layout={layout} />
          {engine && snapshot && (
            <PagePlaygroundControls engine={engine} snapshot={snapshot} busy={busy} run={run} />
          )}
        </div>
        <PagePlaygroundDiagnostics snapshot={snapshot} events={events} />
      </main>
    </ThemeProvider>
  );
}
