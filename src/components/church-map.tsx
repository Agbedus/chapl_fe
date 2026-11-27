"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useRef, type ReactNode } from "react";

export type MapPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** As typed on the branch record; shown in the pin's card. */
  times: string | null;
  /** A maps search for directions, or null when there is no place to search. */
  directions: string | null;
  mine: boolean;
};

/*
 * OpenFreeMap: OpenStreetMap data as vector tiles, free and without a
 * key. Liberty draws the city in natural colours (water, parks, roads,
 * buildings); Dark is its night version, so the map follows the theme.
 */
const STYLE = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

const theme = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

/**
 * Where the branches are, on a real map.
 *
 * MapLibre GL (BSD) over OpenFreeMap's vector tiles. The library is
 * loaded only in the browser and only on this page; until it has drawn,
 * `children` (the server-rendered dot field) stands in, and it stays if
 * the tiles or WebGL never arrive.
 *
 * Each branch is an HTML marker in the product's own dot, the reader's
 * branch ringed, named beside it. A click opens a card with the times
 * and directions. Pointing at a pin lights its row in the list, and
 * pointing at a row (`[data-branch]`) lights its pin, so the two read as
 * one thing. The wheel scrolls the page; ctrl or ⌘ with the wheel zooms
 * the map, and two fingers move it on a phone, because a map that
 * catches the scroll traps the page under it.
 */
export function ChurchMap({ pins, children }: { pins: MapPin[]; children?: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  // The page re-renders on every live refresh, and each render hands in a
  // new array. Keyed on its contents, the map is built once and kept.
  const key = JSON.stringify(pins);

  useEffect(() => {
    const pins = JSON.parse(key) as MapPin[];
    const node = box.current;
    const wrap = frame.current;
    if (!node || !wrap || pins.length === 0) return;
    let cancelled = false;
    let teardown = () => {};

    import("maplibre-gl").then((maplibre) => {
      if (cancelled) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // The worker is copied into public/ by scripts/copy-map-worker.mjs:
      // the library looks for it beside its own module, which the bundler
      // does not emit.
      maplibre.setWorkerUrl(`/vendor/maplibre-gl-worker-${maplibre.getVersion()}.mjs`);
      let map: InstanceType<typeof maplibre.Map>;
      try {
        map = new maplibre.Map({
          container: node,
          style: STYLE[theme()],
          center: [pins[0].longitude, pins[0].latitude],
          zoom: 10,
          attributionControl: { compact: true },
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          fadeDuration: reduce ? 0 : 300,
        });
      } catch {
        return; // No WebGL: the dot field stays.
      }
      map.touchZoomRotate.disableRotation();
      // In development the instance is on window, for driving it from the console.
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __map?: unknown }).__map = map;
      }
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

      const bounds = new maplibre.LngLatBounds();
      pins.forEach((p) => bounds.extend([p.longitude, p.latitude]));
      map.fitBounds(bounds, { padding: { top: 56, bottom: 40, left: 48, right: 72 }, maxZoom: 13, duration: 0 });

      const markers = pins.map((pin) => {
        const el = document.createElement("button");
        el.type = "button";
        el.className = "map-pin";
        el.dataset.pin = pin.id;
        if (pin.mine) el.dataset.mine = "";
        el.setAttribute("aria-label", pin.name);
        const dot = document.createElement("span");
        dot.className = "map-pin-dot";
        const name = document.createElement("span");
        name.className = "map-pin-name";
        name.textContent = pin.name;
        el.append(dot, name);

        // Written with textContent, never as HTML: these are typed records.
        const card = document.createElement("div");
        card.className = "map-card";
        const title = document.createElement("p");
        title.className = "map-card-title";
        title.textContent = pin.name;
        card.append(title);
        if (pin.times) {
          const times = document.createElement("p");
          times.className = "map-card-times";
          times.textContent = pin.times;
          card.append(times);
        }
        if (pin.directions) {
          const go = document.createElement("a");
          go.className = "map-card-go";
          go.href = pin.directions;
          go.target = "_blank";
          go.rel = "noreferrer";
          go.textContent = "Directions";
          card.append(go);
        }
        const popup = new maplibre.Popup({ offset: 14, closeButton: false, maxWidth: "240px", className: "map-popup" })
          .setDOMContent(card);

        const light = (on: boolean) => {
          el.toggleAttribute("data-active", on);
          document
            .querySelectorAll<HTMLElement>(`[data-branch="${pin.id}"]`)
            .forEach((row) => row.toggleAttribute("data-active", on));
        };
        el.addEventListener("pointerenter", () => light(true));
        el.addEventListener("pointerleave", () => light(false));

        return new maplibre.Marker({ element: el, anchor: "left", offset: [-7, 0] })
          .setLngLat([pin.longitude, pin.latitude])
          .setPopup(popup)
          .addTo(map);
      });

      // A row in the list lights its pin.
      const onOver = (event: PointerEvent) => {
        const row = (event.target as HTMLElement).closest<HTMLElement>("[data-branch]");
        node.querySelectorAll(".map-pin[data-active]").forEach((p) => p.removeAttribute("data-active"));
        if (row) node.querySelector(`.map-pin[data-pin="${row.dataset.branch}"]`)?.setAttribute("data-active", "");
      };
      document.addEventListener("pointerover", onOver);

      map.once("load", () => wrap.setAttribute("data-ready", ""));

      // Follow the theme toggle; the markers are HTML and survive a style swap.
      let current = theme();
      const watch = new MutationObserver(() => {
        const next = theme();
        if (next !== current) {
          current = next;
          map.setStyle(STYLE[next]);
        }
      });
      watch.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      teardown = () => {
        watch.disconnect();
        document.removeEventListener("pointerover", onOver);
        markers.forEach((m) => m.remove());
        map.remove();
      };
    });

    return () => {
      cancelled = true;
      teardown();
    };
  }, [key]);

  return (
    <div ref={frame} className="church-map">
      <div className="church-map-fallback">{children}</div>
      <div ref={box} className="church-map-canvas" />
    </div>
  );
}
