"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A label for something that has no room for one.
 *
 * The collapsed sidenav is eight icons and nothing else, and it was
 * relying on the native `title` attribute — which takes about a second to
 * appear, cannot be styled, renders in the OS font, and never shows up on
 * a touch device at all. For the one control that tells you where you are
 * in the app, that is not good enough.
 *
 * ## The delay, and skipping it
 *
 * A tooltip that appears instantly fires every time the pointer crosses
 * anything on its way somewhere else, so the first one waits. But once
 * one is open, the reader has declared they are reading tooltips —
 * moving to the neighbouring icon should show that label **immediately
 * and without animation**. This is the detail that makes a toolbar feel
 * fast: the delay is paid once, not once per item.
 *
 * The open tooltip is tracked in a module-level variable rather than
 * context. It is one boolean about the whole document — no two tooltips
 * are ever open at once — and threading a provider through the tree to
 * store it would be ceremony around a fact.
 */

/** When the last tooltip closed. Within the grace period, the next is instant. */
let lastClosed = 0;
const DELAY = 380;
const GRACE = 500;

type Placement = "right" | "top";

export function Tooltip({
  label,
  placement = "right",
  /** Off when the thing already has a visible label. */
  disabled,
  children,
}: {
  label: string;
  placement?: Placement;
  disabled?: boolean;
  children: ReactNode;
}) {
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [shown, setShown] = useState<{ x: number; y: number; instant: boolean } | null>(
    null,
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const open = () => {
    if (disabled) return;
    const instant = Date.now() - lastClosed < GRACE;

    const show = () => {
      const el = anchor.current?.firstElementChild ?? anchor.current;
      if (!el) return;
      const box = el.getBoundingClientRect();
      setShown(
        placement === "right"
          ? { x: box.right + 10, y: box.top + box.height / 2, instant }
          : { x: box.left + box.width / 2, y: box.top - 10, instant },
      );
    };

    if (instant) show();
    else timer.current = setTimeout(show, DELAY);
  };

  const close = () => {
    clearTimeout(timer.current);
    if (shown) lastClosed = Date.now();
    setShown(null);
  };

  return (
    <>
      <span
        ref={anchor}
        onPointerEnter={open}
        onPointerLeave={close}
        // Keyboard users get it too, on the same terms. A tooltip only a
        // mouse can reach is a label only a mouse can read.
        onFocusCapture={open}
        onBlurCapture={close}
        className="contents"
      >
        {children}
      </span>

      {shown &&
        typeof document !== "undefined" &&
        createPortal(
          /*
             Portalled to the body: the sidenav clips its own overflow, and
             a tooltip that gets cut off by the thing it is describing is
             worse than no tooltip.
          */
          <span
            role="tooltip"
            data-placement={placement}
            data-instant={shown.instant ? "" : undefined}
            className="tip"
            style={{ left: shown.x, top: shown.y }}
          >
            {label}
          </span>,
          document.body,
        )}
    </>
  );
}
