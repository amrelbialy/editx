import { useMemo, useState } from "react";
import { CodeHighlight } from "../code-highlight";
import { generatePlaygroundCode } from "./generate-code";
import type { PlaygroundConfig } from "./playground.types";

interface Props {
  config: PlaygroundConfig;
}

export function PlaygroundCodeOutput(props: Props) {
  const { config } = props;

  const [copied, setCopied] = useState(false);

  const code = useMemo(() => generatePlaygroundCode(config), [config]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <div
        className="flex items-center justify-end border-b border-white/5 px-4 py-1.5"
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
