import type React from "react";
import { useEffect, useState } from "react";

// Module-level pub-sub for screen reader announcements
type Listener = (message: string) => void;
const listeners = new Set<Listener>();

/** Announce a message to screen readers via aria-live region */
export function announce(message: string): void {
  for (const listener of listeners) {
    listener(message);
  }
}

/** Renders a hidden aria-live region. Place once inside the editor shell. */
export const LiveRegion: React.FC = () => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handler: Listener = (msg) => {
      setMessage("");
      requestAnimationFrame(() => setMessage(msg));
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
};
