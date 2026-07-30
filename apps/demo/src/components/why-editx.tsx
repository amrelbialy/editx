import { Blocks, Boxes, Scale, Undo2 } from "lucide-react";

interface Reason {
  icon: React.ElementType;
  title: string;
  desc: string;
}

const REASONS: Reason[] = [
  {
    icon: Scale,
    title: "Open source & MIT",
    desc: "No per-seat fees, no vendor lock-in. Fork it, ship it, own it.",
  },
  {
    icon: Boxes,
    title: "A real engine underneath",
    desc: "A thin UI over a headless, framework-agnostic block engine. Build your own UI or extend ours.",
  },
  {
    icon: Blocks,
    title: "Extensible by design",
    desc: "Register custom tools, render slots, and event hooks — no forking required.",
  },
  {
    icon: Undo2,
    title: "Non-destructive",
    desc: "Every edit is a command: fully undoable, replayable, and serializable.",
  },
];

export function WhyEditx() {
  return (
    <section className="py-14 px-6 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <span className="text-xs font-semibold tracking-widest text-violet-600 uppercase">
          Why Editx
        </span>
        <h2 className="text-3xl font-semibold mt-2 text-zinc-900 dark:text-zinc-100">
          More than a component
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {REASONS.map((r) => (
          <div
            key={r.title}
            className="p-6 rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
              <r.icon className="size-5" />
            </div>
            <h3 className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.title}</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
