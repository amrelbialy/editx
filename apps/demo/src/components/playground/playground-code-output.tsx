import { useMemo, useState } from "react";
import { CodeHighlight } from "../code-highlight";
import type { PlaygroundConfig } from "./playground.types";

interface Props {
  config: PlaygroundConfig;
}

export function PlaygroundCodeOutput(props: Props) {
  const { config } = props;
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    const toolsStr = config.tools.map((t) => `"${t}"`).join(", ");
    const isBuiltIn = config.theme === "dark" || config.theme === "light";
    const themeBlock = isBuiltIn
      ? `{ preset: "${config.theme}" }`
      : `{ preset: "custom", colors: demoPresets["${config.theme}"] }`;
    return `import { ImageEditor } from "@creative-editor/image-editor";

<ImageEditor
  src="/your-image.jpg"
  config={{
    tools: [${toolsStr}],
    theme: ${themeBlock},
    export: {
      defaultFormat: "${config.exportFormat}",
      quality: ${config.exportQuality},
    },
    ui: {
      showTitle: ${config.showTitle},
      unsavedChangesWarning: ${config.unsavedChangesWarning},
    },
  }}
  onSave={(blob) => console.log("Saved:", blob)}
/>`;
  }, [config]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <div
        className="flex items-center justify-end px-4 py-1.5 border-b border-white/5"
        style={{ background: "linear-gradient(145deg, #0c0c1d, #111118)" }}
      >
        <button
          type="button"
          onClick={handleCopy}
          className={`rounded border px-2.5 py-1 text-xs transition-colors ${
            copied
              ? "border-emerald-600 text-emerald-400"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          }`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <CodeHighlight code={code} className="max-h-52 rounded-none border-0" />
    </div>
  );
}
