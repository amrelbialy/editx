import { createContext, useContext } from "react";

/**
 * Context that provides a container element for Radix portals (Popover, Tooltip, etc.)
 * so they render inside the theme scope instead of document.body.
 */
const PopoverContainerContext = createContext<HTMLElement | undefined>(undefined);

export const PopoverContainerProvider = PopoverContainerContext.Provider;

export function usePopoverContainer(): HTMLElement | undefined {
  return useContext(PopoverContainerContext);
}
