import type { EditxEngine } from "@editx/engine";
import { Button, Section } from "@editx/image-editor";
import { addPlaygroundPage } from "./page-playground-scene";
import { PagePropertiesForm } from "./page-properties-form";
import type { PlaygroundSnapshot, RunPlaygroundAction } from "./use-page-observations";

interface Props {
  engine: EditxEngine;
  snapshot: PlaygroundSnapshot;
  busy: boolean;
  run: RunPlaygroundAction;
}

export function PagePlaygroundControls(props: Props) {
  const { engine, snapshot, busy, run } = props;
  const active = snapshot.pages.find((page) => page.id === snapshot.activePageId);
  const index = snapshot.pages.findIndex((page) => page.id === snapshot.activePageId);

  return (
    <aside className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card p-3">
      <Section label="Document pages">
        <div className="flex flex-col gap-2">
          {snapshot.pages.map((page, position) => (
            <Button
              key={page.id}
              variant={page.id === snapshot.activePageId ? "default" : "outline"}
              className="justify-start px-2"
              aria-pressed={page.id === snapshot.activePageId}
              aria-label={`Activate ${page.name || "unnamed"} (page ${page.id})`}
              disabled={busy}
              onClick={() =>
                void run("Activate page", () => {
                  engine.scene.setActivePage(page.id);
                  engine.editor.fitToScreen(24, true);
                })
              }
            >
              <span className="truncate">
                {position + 1}. {page.name || "(unnamed)"}
              </span>
              <span className="ml-auto shrink-0 text-xs">
                {page.width} x {page.height}
              </span>
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="px-2"
            disabled={busy}
            onClick={() => void run("Add page", () => addPlaygroundPage(engine))}
          >
            Add page
          </Button>
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !active}
            onClick={() =>
              active && void run("Duplicate page", () => engine.scene.duplicatePage(active.id))
            }
          >
            Duplicate
          </Button>
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !active}
            onClick={() =>
              active && void run("Delete page", () => engine.scene.removePage(active.id))
            }
          >
            Delete
          </Button>
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !active || index === 0}
            onClick={() =>
              active && void run("Move earlier", () => engine.scene.movePage(active.id, index - 1))
            }
          >
            Move earlier
          </Button>
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !active || index === snapshot.pages.length - 1}
            onClick={() =>
              active && void run("Move later", () => engine.scene.movePage(active.id, index + 1))
            }
          >
            Move later
          </Button>
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || !active || active.id === snapshot.topPageId}
            onClick={() =>
              active &&
              void run("Bring active page to front", () =>
                engine.scene.movePage(active.id, snapshot.pages.length - 1),
              )
            }
          >
            Bring active to front
          </Button>
        </div>
      </Section>
      {active && (
        <Section label={`Page properties / ID ${active.id}`}>
          <PagePropertiesForm
            key={active.id}
            page={active}
            disabled={busy}
            onApply={(update) =>
              void run("Apply page properties", () =>
                engine.scene.setPageProperties(active.id, update),
              )
            }
          />
          <Button
            className="px-2"
            variant="outline"
            disabled={busy || active.metadata === null}
            onClick={() =>
              void run("Clear metadata", () =>
                engine.scene.setPageProperties(active.id, { metadata: null }),
              )
            }
          >
            Clear metadata
          </Button>
        </Section>
      )}
    </aside>
  );
}
