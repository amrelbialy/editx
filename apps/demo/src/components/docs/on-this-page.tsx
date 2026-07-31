import { useEffect, useState } from "react";

type Heading = { id: string; text: string; level: 2 | 3 };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Right-rail "On this page" table of contents. Reads the rendered article's
 * h2/h3 headings, assigns stable ids, and highlights the section in view.
 */
export function OnThisPage(props: {
  containerRef: React.RefObject<HTMLElement | null>;
  pathname: string;
}) {
  const { containerRef, pathname } = props;

  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-scan headings when the route changes
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const nodes = Array.from(root.querySelectorAll<HTMLElement>("h2, h3"));
    const used = new Set<string>();
    const items: Heading[] = nodes.map((node) => {
      const text = node.textContent ?? "";
      let id = node.id || slugify(text);
      while (used.has(id)) id = `${id}-1`;
      used.add(id);
      node.id = id;
      return { id, text, level: node.tagName === "H3" ? 3 : 2 };
    });

    setHeadings(items);
    setActiveId(items[0]?.id ?? "");
  }, [containerRef, pathname]);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
    window.history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav aria-label="On this page" className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
        On this page
      </p>
      <ul className="flex flex-col gap-1 border-l border-zinc-200 dark:border-zinc-800">
        {headings.map((heading) => {
          const active = heading.id === activeId;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={(event) => handleClick(event, heading.id)}
                className={`-ml-px block border-l py-1 text-sm no-underline transition-colors ${
                  heading.level === 3 ? "pl-6" : "pl-3"
                } ${
                  active
                    ? "border-violet-500 text-violet-700 dark:text-violet-400 font-medium"
                    : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
