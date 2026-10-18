import type { PlaygroundEvent, PlaygroundSnapshot } from "./use-page-observations";

interface Props {
  snapshot: PlaygroundSnapshot | null;
  events: PlaygroundEvent[];
}

export function PagePlaygroundDiagnostics(props: Props) {
  const { snapshot, events } = props;

  return (
    <section
      className="grid min-w-0 gap-3 @3xl/editor:grid-cols-2"
      aria-label="Playground diagnostics"
    >
      <div className="min-w-0 rounded-xl border border-border bg-card p-3">
        <h2 className="mb-3 text-sm font-semibold">Live SDK state</h2>
        <pre
          data-testid="page-sdk-state"
          className="max-h-80 overflow-auto whitespace-pre-wrap break-all text-xs"
        >
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </div>
      <div className="min-w-0 rounded-xl border border-border bg-card p-3">
        <h2 className="mb-3 text-sm font-semibold">Recent events and actions</h2>
        <ol
          className="flex max-h-80 flex-col gap-2 overflow-auto text-xs"
          aria-label="Recent engine events"
        >
          {events.map((event) => (
            <li key={event.id} className="break-all">
              <strong>
                #{event.id} {event.type}
              </strong>{" "}
              {event.details}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
