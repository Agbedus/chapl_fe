"use client";

import { areaY, barX, barY, defineChart, dot, lineY, stack } from "@tanstack/charts";
import { geoShape } from "@tanstack/charts/geo";
import { pie, polar, radialArc, radialBarAngle, radialBarRadius } from "@tanstack/charts/polar";
import { Chart } from "@tanstack/charts/react";
import { tooltip } from "@tanstack/charts/tooltip";
import { waffleY } from "@tanstack/charts/waffle";
import { scaleBand } from "@tanstack/charts/scales/band";
import { scaleLinear } from "@tanstack/charts/scales/linear";
import { scaleOrdinal } from "@tanstack/charts/scales/ordinal";
import { scalePoint } from "@tanstack/charts/scales/point";
import { geoMercator } from "d3-geo";
import { useMemo } from "react";

import { PALETTE, turnoutColour } from "@/lib/palette";

/**
 * Wrappers over TanStack Charts.
 *
 * Three deliberate choices:
 *
 * - Colours are CSS custom properties, not literals, so a chart follows the
 *   light/dark toggle without rebuilding its definition.
 * - Time is plotted on a band/point scale over pre-formatted labels rather
 *   than a time scale. The package ships band, linear, ordinal and point
 *   only; a real time axis would mean pulling in d3-scale for a series
 *   that is already one evenly-spaced point per service.
 * - Every chart here answers one question. Where two questions share a
 *   panel they get two marks, not two charts — a leader reads a shape
 *   faster than they read a pair.
 *
 * Every chart carries the built-in tooltip. A dashboard is read at a
 * glance and then interrogated; without hover, the second half of that is
 * a trip to a table.
 */

export type Point = { label: string; value: number };
export type Stacked = { label: string; value: number; series: string };

/* ------------------------------------------------------------------ */
/* time                                                                */
/* ------------------------------------------------------------------ */

/** A measure over time — attendance, giving, growth. */
export function TrendChart({
  data,
  color = "var(--cobalt)",
  ariaLabel,
  label,
  height = 190,
  grid = false,
}: {
  data: Point[];
  color?: string;
  ariaLabel: string;
  label?: string;
  height?: number;
  /** Off unless the reader has to compare against an absolute value. */
  grid?: boolean;
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          // A long, faint underline of the same hue — the modern halo that
          // makes a measure read as luminous rather than printed.
          lineY(data, {
            x: "label",
            y: "value",
            stroke: `color-mix(in oklab, ${color} 30%, transparent)`,
            strokeWidth: 6,
            strokeLinecap: "round",
          }),
          areaY(data, { x: "label", y: "value", fill: color, fillOpacity: 0.12 }),
          lineY(data, { x: "label", y: "value", stroke: color, strokeWidth: 2 }),
          dot(data, {
            x: "label",
            y: "value",
            fill: "var(--paper)",
            stroke: color,
            strokeWidth: 1.5,
            r: 3,
          }),
        ],
        x: { scale: () => scalePoint<string>().padding(0.5) },
        y: {
          scale: scaleLinear,
          nice: true,
          grid,
          axis: label ? { label } : undefined,
        },
        focus: "nearest-x",
        tooltip,
      }),
    [data, color, label, grid],
  );

  return <Chart definition={definition} ariaLabel={ariaLabel} height={height} />;
}

/**
 * A line with no furniture at all — no axes, no ticks, no grid.
 *
 * It sits inside a stat card, under the number it belongs to, and its
 * job is shape rather than value: is this going up, is it steady, did
 * something happen in March. Anyone who wants the value reads the figure
 * above it or opens the page.
 */
export function Sparkline({
  data,
  color = "var(--cobalt)",
  ariaLabel,
  height = 34,
  area = true,
}: {
  data: Point[];
  color?: string;
  ariaLabel: string;
  height?: number;
  area?: boolean;
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          ...(area
            ? [areaY(data, { x: "label", y: "value", fill: color, fillOpacity: 0.16 })]
            : []),
          lineY(data, { x: "label", y: "value", stroke: color, strokeWidth: 1.75 }),
        ],
        x: { scale: () => scalePoint<string>().padding(0), axis: false },
        // `nice` off: a sparkline rounded out to a friendly domain
        // flattens the very movement it exists to show.
        y: { scale: scaleLinear, axis: false, grid: false },
        focus: "nearest-x",
        tooltip,
      }),
    [data, color, area],
  );

  return <Chart definition={definition} ariaLabel={ariaLabel} height={height} />;
}

/* ------------------------------------------------------------------ */
/* comparison                                                          */
/* ------------------------------------------------------------------ */

/**
 * The same ranking laid on its side.
 *
 * Branch and cell names are words, not dates — set vertically they either
 * wrap or tilt, and both are harder to read than a row.
 */
export function BarsChart({
  data,
  color = "var(--violet)",
  colorByLabel,
  ariaLabel,
  height = 240,
  max,
}: {
  data: Point[];
  color?: string;
  colorByLabel?: Record<string, string>;
  ariaLabel: string;
  height?: number;
  /**
   * Pin the far end of the axis — pass 100 for percentages.
   *
   * The scale is `nice` over the data otherwise, which is right for a
   * count and wrong for a share: six branches between 58% and 67% got an
   * axis running to 70, so a 58% bar filled five sixths of its row and
   * every site looked full. A percentage has a fixed maximum and the bar
   * has to be drawn against it.
   */
  max?: number;
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barX(data, {
            y: "label",
            x: "value",
            fill: colorByLabel
              ? (d: Point) => colorByLabel[d.label] ?? color
              : color,
            radius: 3,
            maxThickness: 26,
          }),
        ],
        y: { scale: () => scaleBand<string>().padding(0.16) },
        /*
         * A factory infers its domain from the data; a configured
         * instance fixes it. Passing `domain` as an axis option does
         * nothing at all — it is not part of the spec, so it type-checked,
         * built, rendered, and left the axis exactly as it was.
         */
        x:
          max != null
            ? { scale: scaleLinear().domain([0, max]), grid: false }
            : { scale: scaleLinear, nice: true, grid: false },
        tooltip,
      }),
    [data, color, colorByLabel, max],
  );

  return <Chart definition={definition} ariaLabel={ariaLabel} height={height} />;
}

/**
 * Present against absent, stacked. The gap is the story, so the two belong
 * in one column rather than side by side.
 */
export function StackedChart({
  data,
  colors = ["var(--gold)", "var(--sunk)"],
  domain,
  ariaLabel,
  height = 210,
  grid = false,
}: {
  data: Stacked[];
  colors?: string[];
  domain: string[];
  ariaLabel: string;
  height?: number;
  grid?: boolean;
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          barY(data, {
            x: "label",
            y: "value",
            z: "series",
            color: "series",
            radius: 4,
            // Columns nearly touching. A wide gutter between four weeks
            // makes them read as four separate charts rather than one
            // series, and the whole point is the shape across them.
            maxThickness: 72,
            layout: stack(),
          }),
        ],
        x: { scale: () => scaleBand<string>().padding(0.1) },
        y: { scale: scaleLinear, nice: true, grid },
        color: { scale: () => scaleOrdinal<string, string>(domain, colors) },
        focus: "group-x",
        tooltip,
      }),
    [data, colors, domain, grid],
  );

  return <Chart definition={definition} ariaLabel={ariaLabel} height={height} />;
}

/* ------------------------------------------------------------------ */
/* composition                                                         */
/* ------------------------------------------------------------------ */

/**
 * One ratio against its whole, drawn as an almost-closed ring.
 *
 * A gauge rather than a bar because turnout is a share of 100, not a
 * quantity — the empty arc is as much of the answer as the filled one.
 * The remainder is drawn in `--sunk` rather than left blank so the ring
 * reads as a full circle with a part of it filled, which is what a
 * percentage looks like.
 */
export function GaugeChart({
  value,
  colour,
  ariaLabel,
  height = 150,
  thickness = 0.2,
}: {
  value: number;
  colour: string;
  ariaLabel: string;
  height?: number;
  thickness?: number;
}) {
  const definition = useMemo(() => {
    const clamped = Math.max(0, Math.min(100, value));
    const rows = [
      { label: "reached", value: clamped, fill: colour },
      { label: "remaining", value: 100 - clamped, fill: "var(--sunk)" },
    ];
    const slices = pie(rows, { value: (d: (typeof rows)[number]) => d.value });
    return defineChart({
      marks: [
        polar({
          marks: [
            radialArc(slices, {
              key: (d) => d.label,
              fill: (d) => d.fill,
              innerRadius: ({ radius }) => radius * (1 - thickness),
              outerRadius: ({ radius }) => radius,
              cornerRadius: 5,
              strokeWidth: 0,
            }),
          ],
          inset: 2,
        }),
      ],
    });
  }, [value, colour, thickness]);

  return <Chart definition={definition} ariaLabel={ariaLabel} height={height} />;
}

/**
 * A donut, for a split of a whole — giving by type, care, cell health.
 *
 * Hollow rather than solid on purpose: the hole is where the total goes,
 * and a total in the middle is the number people came for.
 */
export function DonutChart({
  data,
  colors = PALETTE,
  ariaLabel,
  height = 200,
  thickness = 0.3,
}: {
  data: Point[];
  colors?: string[];
  ariaLabel: string;
  height?: number;
  thickness?: number;
}) {
  const definition = useMemo(() => {
    // No gap between slices. The slit was showing the panel behind it,
    // which in dark mode reads as a hard rule around every wedge — the
    // colour change is already the boundary, and it needs no help.
    const slices = pie(data, { value: (d: Point) => d.value });
    return defineChart({
      marks: [
        polar({
          marks: [
            radialArc(slices, {
              key: (d) => d.label,
              fill: (d) => colors[d.index % colors.length],
              innerRadius: ({ radius }) => radius * (1 - thickness),
              outerRadius: ({ radius }) => radius,
              cornerRadius: 3,
              // A hairline of the panel behind each slice, so wedges read
              // as distinct in both themes without relying on shade.
              stroke: "var(--paper)",
              strokeWidth: 1.5,
            }),
          ],
          inset: 4,
        }),
      ],
      tooltip: {
        use: tooltip,
        items: [
          { field: "label", label: "" },
          {
            id: "value",
            label: "",
            text: (point) =>
              `${point.datum.value.toLocaleString()} · ${Math.round(point.datum.fraction * 100)}%`,
          },
        ],
      },
    });
  }, [data, colors, thickness]);

  return <Chart definition={definition} ariaLabel={ariaLabel} height={height} />;
}

/**
 * A radial bar per category, all starting at the centre.
 *
 * Used for turnout by branch: every arc is a percentage of the same 100, so
 * length is directly comparable and the ring makes six sites legible where
 * six columns would read as a bar chart nobody scans.
 */
export function RadialChart({
  data,
  colors = PALETTE,
  max = 100,
  ariaLabel,
  height = 230,
}: {
  data: Point[];
  colors?: string[];
  max?: number;
  ariaLabel: string;
  height?: number;
}) {
  const definition = useMemo(() => {
    // Colour is resolved into the rows rather than read off a mark index,
    // so the arc for a branch keeps its hue when the list reorders.
    const rows = data.map((d, i) => ({ ...d, fill: colors[i % colors.length] }));
    return defineChart({
        marks: [
          polar({
            marks: [
              radialBarRadius(rows, {
                angle: "label",
                radius: "value",
                fill: (d) => d.fill,
                cornerRadius: 2,
              }),
            ],
            angle: { scale: () => scaleBand<string>().padding(0.3) },
            radius: {
              scale: () => scaleLinear().domain([0, max]),
              range: [({ radius }) => radius * 0.22, ({ radius }) => radius],
            },
            inset: 6,
          }),
        ],
        tooltip: {
          use: tooltip,
          items: [
            { field: "label", label: "" },
            { id: "value", label: "Turnout", text: (point) => `${point.datum.value}%` },
          ],
        },
    });
  }, [data, colors, max]);

  return <Chart definition={definition} ariaLabel={ariaLabel} height={height} />;
}

/**
 * A hundred squares, allocated by share.
 *
 * This is the dot from the marketing page, promoted to a chart: one unit is
 * one percent of the congregation. It is the only composition chart here
 * that says "out of a hundred people" without making anyone do arithmetic.
 */
export function WaffleChart({
  data,
  colors = PALETTE,
  ariaLabel,
  height = 180,
}: {
  data: Point[];
  colors?: string[];
  ariaLabel: string;
  height?: number;
}) {
  const total = useMemo(
    () => data.reduce((sum, d) => sum + d.value, 0) || 1,
    [data],
  );

  const definition = useMemo(() => {
    const shares = data.map((d) => ({ ...d, share: d.value / total }));
    return defineChart({
      marks: [
        waffleY(shares, {
          y: "share",
          color: "label",
          unit: 0.01,
          round: true,
          gap: 2,
          radius: 2,
        }),
      ],
      color: {
        scale: () =>
          scaleOrdinal<string, string>(
            data.map((d) => d.label),
            colors,
          ),
      },
      tooltip: {
        use: tooltip,
        items: [
          { field: "label", label: "" },
          {
            id: "share",
            label: "",
            text: (point) =>
              `${point.datum.value.toLocaleString()} · ${Math.round(point.datum.share * 100)}%`,
          },
        ],
      },
    });
  }, [data, colors, total]);

  return <Chart definition={definition} ariaLabel={ariaLabel} height={height} />;
}

/**
 * Concentric arcs — one ring per category, all measured against the same
 * 100 per cent.
 *
 * This is the shape branch turnout actually has. Slices of a pie would be
 * wrong: the branches do not add up to a whole, they are six independent
 * fractions. Stacked one inside another they share a start angle and a
 * scale, so the eye compares arc lengths directly and the ranking is
 * legible without reading a single number.
 *
 * `radialBarAngle` puts the categories on a radius band and the value on
 * the angle, which is the transpose of a normal bar chart and the reason
 * the rings nest.
 */
export function MultiRingChart({
  data,
  colors = PALETTE,
  max = 100,
  ariaLabel,
  height = 220,
}: {
  data: Point[];
  colors?: string[];
  max?: number;
  ariaLabel: string;
  height?: number;
}) {
  const definition = useMemo(() => {
    // Colour is resolved into the rows rather than read off a mark index,
    // so a branch keeps its hue when the ranking reorders.
    const rows = data.map((d, i) => ({ ...d, fill: colors[i % colors.length] }));
    return defineChart({
      marks: [
        polar({
          marks: [
            // The track each arc runs in, so an empty ring still reads as
            // a ring rather than as missing data.
            radialBarAngle(
              rows.map((r) => ({ ...r, value: max })),
              {
                radius: "label",
                angle: "value",
                fill: "var(--sunk)",
                cornerRadius: 6,
                strokeWidth: 0,
              },
            ),
            radialBarAngle(rows, {
              radius: "label",
              angle: "value",
              fill: (d) => d.fill,
              cornerRadius: 6,
              strokeWidth: 0,
            }),
          ],
          radius: {
            scale: () => scaleBand<string>().padding(0.42),
            // Push every band into the outer half. The default range
            // starts at the centre, which ran the innermost ring straight
            // through the label sitting there.
            range: [({ radius }) => radius * 0.46, ({ radius }) => radius],
          },
          angle: { scale: () => scaleLinear().domain([0, max]) },
          // A full revolution. The partial sweep bunched every arc into
          // one quadrant and put the shortest ones where they could not
          // be compared.
          inset: 2,
        }),
      ],
      tooltip: {
        use: tooltip,
        items: [
          { field: "label", label: "" },
          { id: "value", label: "Turnout", text: (point) => `${point.datum.value}%` },
        ],
      },
    });
  }, [data, colors, max]);

  return <Chart definition={definition} ariaLabel={ariaLabel} height={height} />;
}

/* ------------------------------------------------------------------ */
/* geography                                                           */
/* ------------------------------------------------------------------ */

export type MapPin = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  members: number;
  turnout: number;
};

/**
 * Branches placed where they actually are.
 *
 * Drawn with the package's own `geoShape` over a Mercator projection fitted
 * to the pins, rather than a tile map. A tile map would mean a third-party
 * script and a request to someone else's server on every dashboard load,
 * for a picture of at most a few dozen sites in one metropolitan area —
 * where the useful information is relative position and relative size, not
 * which street the building is on.
 *
 * Radius is membership; fill is turnout. A big pale circle is a large site
 * that did not show up, and that is exactly the thing worth spotting.
 */
export function BranchMap({
  pins,
  ariaLabel,
  height = 320,
}: {
  pins: MapPin[];
  ariaLabel: string;
  height?: number;
}) {
  const definition = useMemo(() => {
    const biggest = Math.max(...pins.map((p) => p.members), 1);

    const features = pins.map((pin) => ({
      type: "Feature" as const,
      id: pin.id,
      properties: pin,
      geometry: {
        type: "Point" as const,
        coordinates: [pin.longitude, pin.latitude] as [number, number],
      },
    }));

    return defineChart({
      marks: [
        geoShape(features, {
          projection: { type: geoMercator, fit: "data", inset: 34 },
          key: (f) => f.properties.id,
          // Area, not radius, tracks membership — a circle twice as wide
          // reads as four times as much, which would overstate it.
          r: (f) => f.properties.members,
          rScale: (value) => 5 + Math.sqrt(value / biggest) * 20,
          fill: (f) => turnoutColour(f.properties.turnout),
          fillOpacity: 0.75,
          stroke: "var(--paper)",
          strokeWidth: 1.5,
        }),
      ],
      // The bubbles carry no labels — six overlapping names on a city-scale
      // map is worse than none. Hover is where a site says who it is.
      tooltip: {
        use: tooltip,
        items: [
          { id: "name", label: "", text: (point) => point.datum.properties.name },
          {
            id: "turnout",
            label: "",
            text: (point) =>
              `${point.datum.properties.members.toLocaleString()} on the roll · ${
                point.datum.properties.turnout
              }% turnout`,
          },
        ],
      },
    });
  }, [pins]);

  return <Chart definition={definition} ariaLabel={ariaLabel} height={height} />;
}
