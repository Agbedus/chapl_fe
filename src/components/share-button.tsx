"use client";

import { Share2 } from "lucide-react";

import { toast } from "@/components/toaster";

/** Copy through a selected, off-screen text box: the old way, still
    allowed where the clipboard API is not (an embedded browser, a strict
    policy). */
function copyByHand(text: string): boolean {
  const box = document.createElement("textarea");
  box.value = text;
  box.setAttribute("readonly", "");
  box.style.position = "fixed";
  box.style.opacity = "0";
  document.body.appendChild(box);
  box.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  box.remove();
  return ok;
}

/**
 * Share a sermon or an event: the system share sheet where there is one
 * (phones, Safari), otherwise the link copied. `path` is the page in this
 * app, so the link someone receives opens the same thing — after they
 * sign in, because it is the church's and not the public's.
 */
export function ShareButton({ title, text, path }: { title: string; text?: string; path: string }) {
  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        // Closing the sheet is not a failure.
        if ((error as Error).name === "AbortError") return;
      }
    }
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      copied = copyByHand(url);
    }
    if (copied) toast("Link copied.");
    else toast("Could not copy the link.", "error");
  };
  return (
    <button type="button" onClick={share} className="btn btn-sm btn-quiet">
      <Share2 className="h-3.5 w-3.5" aria-hidden />
      Share
    </button>
  );
}
