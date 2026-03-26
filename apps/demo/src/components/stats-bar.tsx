import { Blocks, Github, Layers } from "lucide-react";

const STATS = [
  { icon: Layers, label: "Tools", value: "6+", sub: "crop, adjust, filter, text, shapes, image" },
  { icon: Blocks, label: "Architecture", value: "Block-based", sub: "command pattern · undo/redo" },
  { icon: Github, label: "Open Source", value: "Free", sub: "MIT licensed" },
];

export function StatsBar() {
  return (
    <section className="border-y border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 py-10 px-6">
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
              <s.icon size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{s.value}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {s.label} · {s.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
