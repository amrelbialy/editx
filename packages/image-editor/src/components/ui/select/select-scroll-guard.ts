import * as React from "react";

// When a Radix Select opens it locks page scroll via react-remove-scroll, which
// sets `overflow: hidden` on <body>. On the common host layout where the real
// scroller is <html> (`html { overflow: auto }`) and the page content overflows
// a viewport-height <body> (`body { height: 100% }`), that clip has two bad
// effects: (a) it collapses <html>'s scrollHeight to the viewport, so the
// browser natively clamps scrollTop to 0 — jumping an inline-embedded editor out
// of view (no JS scroll API is involved, so it can't be intercepted; the zoom
// DropdownMenu is immune only because it never locks body scroll); and (b) it
// turns <body> into a scroll container, so any descendant `position: sticky`
// (e.g. a host page header) sticks to the now-static body and scrolls away. A
// secondary jump comes from Radix scrolling the selected item into view on open.
// Fix: (1) force <body>'s pre-lock `overflow` back inline with `!important` so
// the lock clips nothing — the document scroll height/position is preserved and
// sticky descendants keep <html> as their scroll container (react-remove-scroll
// still blocks background scroll via its own wheel/touch listeners), and (2)
// force focus to `preventScroll` and anchor the document scroller back on scroll
// so the selected-item scroll can't move the page (the portalled dropdown
// viewport still scrolls its own list). Everything is restored when the menu closes.
export function useSelectScrollGuard() {
  const cleanupRef = React.useRef<(() => void) | null>(null);

  React.useEffect(() => () => cleanupRef.current?.(), []);

  const arm = React.useCallback(() => {
    // Idempotent: the trigger arms on pointerdown; a later open must keep that
    // snapshot (re-capturing could read an already-clamped scroll position).
    if (cleanupRef.current) return;
    if (typeof document === "undefined") return;
    const body = document.body;
    const scroller = (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
    if (!body || !scroller) return;
    const prevOverflow = body.style.overflow;
    const prevBehavior = scroller.style.scrollBehavior;
    const prevMarginRight = body.style.marginRight;
    const prevPaddingRight = body.style.paddingRight;
    const snapTop = scroller.scrollTop;
    const snapLeft = scroller.scrollLeft;
    // Values the page actually wants, read before react-remove-scroll overrides
    // them: its own `overflow` (kept so the scroll container never changes) and
    // the scrollbar gap it would compensate for a scrollbar our pin won't remove.
    const cs = getComputedStyle(body);
    const baseOverflow = cs.overflow;
    const baseMarginRight = cs.marginRight;
    const basePaddingRight = cs.paddingRight;
    // A host `scroll-behavior: smooth` makes the selected-item scrollIntoView
    // animate async and makes our scrollTop restore a silent no-op — force it off.
    scroller.style.scrollBehavior = "auto";
    // (1) Force the pre-lock `overflow` back so the scroll-lock clips nothing:
    // the document scrollHeight/position can't collapse and <body> never becomes
    // a scroll container, so sticky descendants keep sticking. Inline !important
    // beats react-remove-scroll's stylesheet rule.
    const pin = () => {
      if (body.style.getPropertyValue("overflow") !== baseOverflow)
        body.style.setProperty("overflow", baseOverflow, "important");
      // The overflow override keeps the scrollbar present, so react-remove-scroll's
      // margin/padding-right offset for a "removed" scrollbar is spurious and
      // leaves a gap — force the pre-lock values back too.
      if (body.style.getPropertyValue("margin-right") !== baseMarginRight)
        body.style.setProperty("margin-right", baseMarginRight, "important");
      if (body.style.getPropertyValue("padding-right") !== basePaddingRight)
        body.style.setProperty("padding-right", basePaddingRight, "important");
    };
    pin();
    // react-remove-scroll applies its styles in a layout effect after this fires;
    // re-pin on body mutations so the clip never gets a chance to collapse.
    const observer = new MutationObserver(pin);
    observer.observe(body, {
      attributes: true,
      attributeFilter: ["style", "class", "data-scroll-locked"],
    });
    // (2) Stop the selected-item scroll from moving the document scroller.
    const origFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function focus(this: HTMLElement, options?: FocusOptions) {
      return origFocus.call(this, { ...options, preventScroll: true });
    };
    const restore = () => {
      if (scroller.scrollTop !== snapTop) scroller.scrollTop = snapTop;
      if (scroller.scrollLeft !== snapLeft) scroller.scrollLeft = snapLeft;
    };
    document.addEventListener("scroll", restore, true);
    cleanupRef.current = () => {
      cleanupRef.current = null;
      observer.disconnect();
      HTMLElement.prototype.focus = origFocus;
      document.removeEventListener("scroll", restore, true);
      scroller.style.scrollBehavior = prevBehavior;
      body.style.removeProperty("overflow");
      body.style.removeProperty("margin-right");
      body.style.removeProperty("padding-right");
      if (prevOverflow) body.style.overflow = prevOverflow;
      if (prevMarginRight) body.style.marginRight = prevMarginRight;
      if (prevPaddingRight) body.style.paddingRight = prevPaddingRight;
    };
  }, []);

  const disarm = React.useCallback(() => cleanupRef.current?.(), []);

  return { arm, disarm };
}
