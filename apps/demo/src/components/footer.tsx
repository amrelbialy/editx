const FOOTER_LINKS = {
  Resources: [
    { label: "GitHub", href: "https://github.com/amrelbialy/editx" },
    { label: "npm", href: "https://www.npmjs.com/package/@editx/image-editor" },
    { label: "Documentation", href: "/docs" },
  ],
  Examples: [
    { label: "Playground", href: "/playground" },
    { label: "Demo", href: "/demo" },
    { label: "Theming", href: "/docs/image-editor/theming" },
  ],
  Support: [
    { label: "Report an Issue", href: "https://github.com/amrelbialy/editx/issues" },
    { label: "Discussions", href: "https://github.com/amrelbialy/editx/discussions" },
    { label: "Contact", href: "https://github.com/amrelbialy/editx" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 text-zinc-400">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <h3 className="text-lg font-semibold text-white">Editx</h3>
          <p className="mt-2 text-sm leading-relaxed">
            Open-source block-based image editor for React. Crop, adjust, filter, annotate &amp;
            export.
          </p>
        </div>
        {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
          <div key={heading}>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {heading}
            </h4>
            <ul className="space-y-2 text-sm">
              {links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-zinc-400 no-underline transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
        Built with React 19, Konva 10 &amp; Tailwind CSS 4.
      </div>
    </footer>
  );
}
