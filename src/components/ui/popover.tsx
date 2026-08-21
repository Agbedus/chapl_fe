"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * The shell every picker on this page opens into.
 *
 * Three of them needed the same six things — position under the trigger,
 * flip up when there is no room below, close on Escape, close on an
 * outside press, give focus somewhere useful, and hand it back on the way
 * out — so they are written once rather than three times slightly
 * differently.
 *
 * **It is portalled to the body on purpose.** Every one of these lives
 * inside `.modal-body`, which scrolls and therefore clips. A date picker
 * cut in half by the form it belongs to is worse than a native one.
 *
 * The panel scales from the edge it is anchored to rather than from its
 * own middle, which is the difference between a menu growing out of its
 * field and a menu appearing in the air next to it.
 */
export function Popover({
  open,
  onClose,
  anchor,
  labelledBy,
  children,
  width,
}: {
  open: boolean;
  onClose: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  labelledBy?: string;
  children: ReactNode;
  /** Defaults to matching the trigger, which is what a field wants. */
  width?: number;
}) {
  const panel = useRef<HTMLDivElement>(null);

  /*
   * Position is written straight to the node, never held in state.
   *
   * The obvious version measures into `useState`, which costs a render on
   * open and another on every scroll frame — and the compiler rejects it
   * outright as a cascading render. Position is not data the tree needs;
   * it is four numbers the browser needs. Writing them to `style`
   * directly means scrolling a modal with a picker open re-renders
   * nothing at all.
   */
  useLayoutEffect(() => {
    if (!open) return;

    const measure = () => {
      const el = anchor.current;
      const box = panel.current;
      if (!el || !box) return;
      const r = el.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      // Flip up only when there is genuinely no room below *and* more
      // above — otherwise a picker near the bottom of a tall modal
      // flickers between the two on every resize.
      const up = below < box.offsetHeight + 12 && r.top > below;

      /*
       * Clamped to the viewport.
       *
       * The panel was pinned to the trigger's left edge, which is right
       * for a form field and wrong for anything near the right-hand side
       * — the notification tray hangs off a bell in the top bar corner
       * and rendered half off-screen. It prefers left-aligned, flips to
       * right-aligned when that would overflow, and never goes past the
       * edge either way.
       */
      const panelWidth = width ?? r.width;
      const margin = 8;
      let left = r.left;
      if (left + panelWidth > window.innerWidth - margin) {
        left = Math.max(margin, r.right - panelWidth);
      }
      box.style.left = `${Math.max(margin, left)}px`;
      box.style.top = `${up ? r.top - 6 : r.bottom + 6}px`;
      box.style.width = `${panelWidth}px`;
      box.style.visibility = "visible";
      if (up) box.dataset.up = "";
      else delete box.dataset.up;
    };
    measure();

    window.addEventListener("resize", measure);
    // `true` for capture: the modal body is the thing that scrolls, and a
    // scroll event on it does not bubble to the window.
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, anchor, width]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Stop the modal behind from closing as well. One Escape should
      // undo one thing, and the thing on top is the picker.
      event.stopPropagation();
      onClose();
      anchor.current?.focus();
    };

    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panel.current?.contains(target) || anchor.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, onClose, anchor]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    // Hidden until measured, so it never paints once at the top-left
    // corner and jumps into place.
    <div
      ref={panel}
      role="dialog"
      aria-labelledby={labelledBy}
      className="pop"
      style={{ left: 0, top: 0, visibility: "hidden" }}
    >
      {children}
    </div>,
    document.body,
  );
}
