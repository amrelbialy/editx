import { Github, Menu, Moon, Package, Sun, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useDarkMode } from "../hooks/use-dark-mode";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Docs", href: "/docs" },
  { label: "Playground", href: "/playground" },
];

const GITHUB_URL = "https://github.com/nicholasgriffintn/editx";
const NPM_URL = "https://www.npmjs.com/package/@editx/image-editor";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/docs") return pathname.startsWith("/docs");
  return pathname === href;
}

function LogoMark() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="50%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#logo-grad)" opacity="0.15" />
      <rect x="6" y="6" width="12" height="12" rx="3" fill="url(#logo-grad)" opacity="0.35" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="url(#logo-grad)" />
    </svg>
  );
}

const ICON_BTN =
  "flex items-center justify-center rounded-lg p-2 text-zinc-400 dark:text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100";

export function Navbar() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, toggleDark] = useDarkMode();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md shadow-[0_1px_8px_-2px_rgba(124,58,237,0.06)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-6">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <LogoMark />
          <span className="flex items-baseline font-black tracking-tight">
            <span
              className="text-4xl bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 50%, #10b981 100%)",
              }}
            >
              Editx
            </span>
          </span>
        </Link>

        {/* Center links â€” desktop */}
        <div className="hidden md:flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 p-1 absolute left-1/2 -translate-x-1/2">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.label}
                to={link.href}
                className={`rounded-md px-4 py-1.5 text-sm no-underline transition-colors ${
                  active
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-medium shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right icons â€” desktop */}
        <div className="hidden md:flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={toggleDark}
            className={ICON_BTN}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a
            href={NPM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={ICON_BTN}
            aria-label="npm"
          >
            <Package size={18} />
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={ICON_BTN}
            aria-label="GitHub"
          >
            <Github size={18} />
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="ml-auto md:hidden rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-6 py-3 flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2 text-sm no-underline transition-colors ${
                  active
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <div className="mt-2 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
            <button
              type="button"
              onClick={toggleDark}
              className={ICON_BTN}
              aria-label="Toggle dark mode"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <a
              href={NPM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={ICON_BTN}
              aria-label="npm"
            >
              <Package size={18} />
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={ICON_BTN}
              aria-label="GitHub"
            >
              <Github size={18} />
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
