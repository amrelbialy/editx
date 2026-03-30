import type React from "react";
import { useMemo } from "react";

interface Token {
  type: string;
  value: string;
}

const RULES: [string, RegExp][] = [
  ["comment", /^\/\/.*/],
  ["string", /^"[^"]*"|^'[^']*'|^`[^`]*`/],
  ["keyword", /^(?:import|from|export|const|let|var|function|return|type|interface)\b/],
  ["boolean", /^(?:true|false)\b/],
  ["number", /^[\d.]+/],
  ["tag", /^<\/?[A-Z][A-Za-z]*/],
  ["attr", /^\s[a-z][a-zA-Z]*(?==)/],
  ["brace", /^[{}[\]()]/],
  ["operator", /^[=<>!&|?:]+|^=>|^\.{3}/],
  ["punctuation", /^[;,./]/],
  ["plain", /^[^\s"'`<>{}[\]()=!&|?:;,./]+/],
  ["space", /^\s+/],
];

export function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let remaining = code;
  while (remaining.length > 0) {
    let matched = false;
    for (const [type, regex] of RULES) {
      const m = remaining.match(regex);
      if (m) {
        tokens.push({ type, value: m[0] });
        remaining = remaining.slice(m[0].length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokens.push({ type: "plain", value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }
  return tokens;
}

export const COLOR_MAP: Record<string, string> = {
  keyword: "text-purple-400",
  string: "text-emerald-400",
  boolean: "text-amber-400",
  number: "text-amber-400",
  tag: "text-sky-400",
  attr: "text-violet-300",
  comment: "text-zinc-500 italic",
  brace: "text-zinc-400",
  operator: "text-pink-400",
  punctuation: "text-zinc-500",
  plain: "text-zinc-200",
  space: "",
};

interface Props {
  code: string;
  className?: string;
}

export function CodeHighlight(props: Props) {
  const { code, className = "" } = props;

  const tokens = useMemo(() => tokenize(code), [code]);

  return (
    <pre
      className={`overflow-x-auto rounded-2xl border border-zinc-800/60 p-5 text-[13px] leading-relaxed shadow-[0_8px_40px_-8px_rgba(0,0,0,0.5)] ${className}`}
      style={{ background: "linear-gradient(145deg, #0c0c1d 0%, #111118 50%, #0a0a14 100%)" }}
    >
      <code className="font-mono">
        {
          tokens.reduce<{ offset: number; elements: React.ReactNode[] }>(
            (acc, token) => {
              acc.elements.push(
                <span
                  key={`${acc.offset}-${token.type}`}
                  className={COLOR_MAP[token.type] ?? "text-zinc-200"}
                >
                  {token.value}
                </span>,
              );
              acc.offset += token.value.length;
              return acc;
            },
            { offset: 0, elements: [] },
          ).elements
        }
      </code>
    </pre>
  );
}
