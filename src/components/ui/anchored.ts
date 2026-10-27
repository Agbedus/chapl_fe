"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useRef, type RefObject } from "react";

/** Every pop-up form is this wide, multi-step or not, so they read as one family. */
export const PANEL_WIDTH = 640;

/**
 * A pop-up that opens from the button that opened it, and closes back
 * into it.
 *
 * Not centred: the panel hangs just below its button, right edges
 * aligned, so it reads as that button unfolding rather than a dialog
 * arriving from nowhere. It is revealed from the button's corner — a
 * clip-path inset opening down and outward, with a slight scale from the
 * same corner — and its contents follow once it has mostly opened (see
 * `.modal-anchored` in globals.css). Closing runs the reveal backwards,
 * faster: the app answering is quicker than the app presenting.
 *
 * A button near the bottom of the screen opens the panel upward, from the
 * button's top corner. A phone has no room to hang anything, so there the
 * panel is full width from the top. Position is written to the node, not
 * held in state — it is geometry the browser needs, not data the tree does.
 *
 * Returns `close`, which animates out and then calls `onClosed`. Escape
 * calls it too.
 */
export function useAnchoredPanel({
  open,
  trigger,
  panel,
  scrim,
  onClosed,
}: {
  open: boolean;
  trigger: RefObject<HTMLElement | null>;
  panel: RefObject<HTMLElement | null>;
  scrim: RefObject<HTMLElement | null>;
  onClosed: () => void;
}) {
  const closing = useRef(false);

  useLayoutEffect(() => {
    const node = panel.current;
    if (!open || !node) return;
    place(node, trigger.current);
    reveal(node, false);
    const onResize = () => place(node, trigger.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, panel, trigger]);

  function close() {
    const node = panel.current;
    if (!node || closing.current) return onClosed();
    closing.current = true;
    scrim.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: "ease-out", fill: "both" });
    reveal(node, true).finished.finally(() => {
      closing.current = false;
      onClosed();
    });
  }

  const dismiss = useEffectEvent(() => close());
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return { close };
}

function place(panel: HTMLElement, trigger: HTMLElement | null) {
  const button = trigger?.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const gap = 8;
  const edge = 12;
  panel.style.position = "fixed";
  panel.style.margin = "0";
  if (!button || vw < 640) {
    Object.assign(panel.style, {
      left: `${edge}px`, right: `${edge}px`, top: `${edge}px`, bottom: "auto",
      width: "auto", maxWidth: "none", maxHeight: `${vh - edge * 2}px`,
    });
    panel.dataset.from = "top";
    return;
  }
  const width = Math.min(PANEL_WIDTH, vw - edge * 2);
  // Right-aligned to the button, but never off the left of the screen.
  const right = Math.min(Math.max(edge, vw - button.right), vw - width - edge);
  const below = vh - button.bottom - gap - edge;
  const above = button.top - gap - edge;
  const up = below < 360 && above > below;
  Object.assign(panel.style, {
    width: `${width}px`,
    maxWidth: "none",
    right: `${right}px`,
    left: "auto",
    top: up ? "auto" : `${button.bottom + gap}px`,
    bottom: up ? `${vh - button.top + gap}px` : "auto",
    maxHeight: `${up ? above : below}px`,
  });
  panel.dataset.from = up ? "bottom" : "top";
}

function reveal(panel: HTMLElement, reverse: boolean) {
  const up = panel.dataset.from === "bottom";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return panel.animate([{ opacity: reverse ? 1 : 0 }, { opacity: reverse ? 0 : 1 }], {
      duration: 140, easing: "ease-out", fill: "both",
    });
  }
  panel.style.transformOrigin = up ? "bottom right" : "top right";
  // Folded into the button's corner: most of the width and nearly all of
  // the height clipped away, a touch smaller, faded.
  const shut = {
    clipPath: up ? "inset(92% 0 0 70% round 20px)" : "inset(0 0 92% 70% round 20px)",
    transform: "scale(0.96)",
    opacity: 0,
  };
  const shown = { clipPath: "inset(0 0 0 0 round 20px)", transform: "none", opacity: 1 };
  return panel.animate(reverse ? [shown, shut] : [shut, shown], {
    duration: reverse ? 200 : 340,
    easing: reverse ? "cubic-bezier(0.4, 0, 1, 1)" : "cubic-bezier(0.23, 1, 0.32, 1)",
    fill: "both",
  });
}
