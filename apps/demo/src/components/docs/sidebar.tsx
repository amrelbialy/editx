import { Link } from "react-router";
import { DOCS_NAV } from "../../docs/docs-nav";

const linkClass = (active: boolean) =>
  `block px-2.5 py-1.5 rounded-md text-sm no-underline transition-colors ${
    active
      ? "bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-medium"
      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
  }`;

/** Left navigation sidebar, driven by the shared docs nav model. */
export function DocsSidebar(props: { pathname: string }) {
  const { pathname } = props;

  return (
    <nav className="flex flex-col gap-6">
      {DOCS_NAV.map((group) => (
        <div key={group.heading}>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {group.heading}
          </h4>
          <ul className="flex flex-col gap-1">
            {group.links.map((link) => (
              <li key={link.href}>
                <Link to={link.href} className={linkClass(pathname === link.href)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
