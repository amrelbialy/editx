import { useCallback, useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "ce-dark-mode";
const DARK_MODE_EVENT = "editx-dark-mode-change";

function getDarkMode() {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function subscribe(onStoreChange: () => void) {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onStoreChange();
  };

  window.addEventListener(DARK_MODE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(DARK_MODE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

export function useDarkMode() {
  const dark = useSyncExternalStore(subscribe, getDarkMode, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(STORAGE_KEY, String(dark));
  }, [dark]);

  const toggleDark = useCallback(() => {
    const nextDark = !getDarkMode();
    localStorage.setItem(STORAGE_KEY, String(nextDark));
    document.documentElement.classList.toggle("dark", nextDark);
    window.dispatchEvent(new Event(DARK_MODE_EVENT));
  }, []);

  return [dark, toggleDark] as const;
}
