import { useState } from "react";
import { COLOR_MAP, CodeHighlight, tokenize } from "./code-highlight";
import { CopyButton } from "./copy-button";

const INSTALL_CMD = "pnpm add @editx/image-editor";
const IMPORT_CMD = 'import { ImageEditor } from "@editx/image-editor";';

function InlineCode(props: { code: string }) {
  const tokens = tokenize(props.code);
  return (
    <>
      {tokens.map((token, i) => (
        <span key={`${i}-${token.type}`} className={COLOR_MAP[token.type] ?? "text-zinc-200"}>
          {token.value}
        </span>
      ))}
    </>
  );
}

const STEPS = [
  {
    num: 1,
    title: "Install",
    content: (
      <div
        className="code-snippet mt-auto flex items-center gap-2 overflow-x-auto rounded-xl border border-zinc-700/50 px-3 py-3 font-mono text-[10px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]"
        style={{ background: "linear-gradient(145deg, #0c0c1d, #111118)" }}
      >
        <span className="shrink-0">
          <InlineCode code={INSTALL_CMD} />
        </span>
        <CopyButton text={INSTALL_CMD} className="ml-auto shrink-0" />
      </div>
    ),
  },
  {
    num: 2,
    title: "Import",
    content: (
      <div
        className="code-snippet mt-auto flex items-center gap-2 overflow-x-auto rounded-xl border border-zinc-700/50 px-3 py-3 font-mono text-[10px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.4)]"
        style={{ background: "linear-gradient(145deg, #0c0c1d, #111118)" }}
      >
        <span className="shrink-0">
          <InlineCode code={IMPORT_CMD} />
        </span>
        <CopyButton text={IMPORT_CMD} className="ml-auto shrink-0" />
      </div>
    ),
  },
  {
    num: 3,
    title: "Use",
    content: (
      <p className="mt-auto text-sm text-zinc-500 leading-relaxed">
        Add{" "}
        <code className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700 text-xs font-mono">
          &lt;ImageEditor&gt;
        </code>{" "}
        to your component, pass a{" "}
        <code className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700 text-xs font-mono">
          src
        </code>{" "}
        and an{" "}
        <code className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700 text-xs font-mono">
          onSave
        </code>{" "}
        callback.
      </p>
    ),
  },
];

const TABS = {
  React: `import { ImageEditor } from "@editx/image-editor";

function App() {
  return (
    <ImageEditor
      src="/your-image.jpg"
      config={{
        tools: ["crop", "adjust", "filter", "text", "shapes"],
        theme: { preset: "light" },
      }}
      onSave={(blob) => {
        const url = URL.createObjectURL(blob);
        console.log("Saved:", url);
      }}
    />
  );
}`,
  Modal: `import { ImageEditorModal } from "@editx/image-editor";
import { useState } from "react";

function App() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Edit Image</button>
      <ImageEditorModal
        open={open}
        onOpenChange={setOpen}
        src="/your-image.jpg"
        onSave={(blob) => console.log("Saved:", blob)}
      />
    </>
  );
}`,
};

type TabKey = keyof typeof TABS;

export function QuickStart() {
  const [tab, setTab] = useState<TabKey>("React");

  return (
    <section className="py-14 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <span className="text-xs font-semibold tracking-widest text-violet-600 uppercase">
          Quick Start
        </span>
        <h2 className="text-3xl font-semibold mt-2 text-zinc-900 dark:text-zinc-100">
          Up and running in minutes
        </h2>
        <p className="mt-2 text-zinc-500">
          Add an image editor to your React app with a few lines of code.
        </p>
      </div>

      {/* Step cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {STEPS.map((step) => (
          <div
            key={step.num}
            className="flex flex-col min-w-0 rounded-2xl bg-zinc-50 dark:bg-zinc-900 p-6 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.03)]"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/40 text-sm font-bold text-violet-700 dark:text-violet-400">
                {step.num}
              </span>
              <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {step.title}
              </span>
            </div>
            {step.content}
          </div>
        ))}
      </div>

      {/* Tabbed code block */}
      <div
        className="overflow-hidden rounded-2xl border border-zinc-800/60 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.5)]"
        style={{ background: "linear-gradient(145deg, #0c0c1d 0%, #111118 50%, #0a0a14 100%)" }}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-1">
          <div className="flex">
            {(Object.keys(TABS) as TabKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  tab === key
                    ? "text-white border-b-2 border-violet-500"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {key}
              </button>
            ))}
          </div>
          <CopyButton text={TABS[tab]} className="mr-2" />
        </div>
        <CodeHighlight code={TABS[tab]} />
      </div>
    </section>
  );
}
