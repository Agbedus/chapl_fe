"use client";

import { areaY, barX, barY, defineChart, dot, lineY, ruleY, stack } from "@tanstack/charts";
import { geoShape } from "@tanstack/charts/geo";
import { pie, polar, radialArc } from "@tanstack/charts/polar";
import { Chart } from "@tanstack/charts/react";
import { tooltip } from "@tanstack/charts/tooltip";
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
 * The dashboard's look is built in here, so every screen gets it: lines
 * and sparklines draw in from the left, columns and stacks rise from the
 * floor (`.chart-draw`, `.chart-rise`), and ticks, tick labels and grid
 * stay out of the way until the chart is pointed at (`.chart-quiet`).
 * Horizontal bars keep their axis, because the category names are on it.
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

/** 40000 → "40k". Written out rather than `Intl` so the server and the browser agree. */
function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}m`;
  if (abs >= 1_000) return `${+(value / 1_000).toFixed(1)}k`;
  return String(+value.toFixed(1));
}
export type Stacked = { label: string; value: number; series: string };

/* ------------------------------------------------------------------ */
/* time                                                                */
/* ------------------------------------------------------------------ */

/**
 * A measure over time — attendance, giving, growth.
 *
 * `target` draws one dashed rule across the plot: the line the measure is
 * meant to clear. Turnout's is 70%, the same threshold that turns a
 * figure emerald everywhere else, so "are we there" is read off the
 * picture instead of remembered. The rule takes part in the domain, so a
 * church running at 55% still sees how far off it is.
 */
export function TrendChart({
  data,
  color = "var(--cobalt)",
  ariaLabel,
  label,
  height = 190,
  grid = false,
  target,
  area = true,
}: {
  data: Point[];
  color?: string;
  ariaLabel: string;
  label?: string;
  height?: number;
  /** Off unless the reader has to compare against an absolute value. */
  grid?: boolean;
  target?: number;
  /**
   * The fill under the line. It pins the axis to zero, which is right
   * for a count and flattens a share that moves between 58 and 66.
   */
  area?: boolean;
}) {
  const definition = useMemo(
    () =>
      defineChart({
        marks: [
          ...(target != null
            ? [ruleY([target], { stroke: "var(--ink-3)", strokeOpacity: 0.55, strokeDasharray: "3 4" })]
            : []),
          ...(area ? [areaY(data, { x: "label", y: "value", fill: color, fillOpacity: 0.09 })] : []),
          lineY(data, { x: "label", y: "value", stroke: color, strokeWidth: 2 }),
          dot(data, {
            x: "label",
            y: "value",
            fill: "var(--paper)",
            stroke: color,
            strokeWidth: 1.5,
            r: 2.75,
          }),
        ],
        x: { scale: () => scalePoint<string>().padding(0.5) },
        y: {
          scale: scaleLinear,
          nice: true,
          grid,
          axis: { ...(label ? { label } : {}), ticks: { count: 3, format: compact } },
        },
        focus: "nearest-x",
        tooltip,
      }),
    [data, color, label, grid, target, area],
  );

  return (
    <div className="chart-quiet chart-draw">
      <Chart definition={definition} ariaLabel={ariaLabel} height={height} />
    </div>
  );
}

/**
 * Periods as columns: giving by month, people joined by month.
 *
 * Columns rather than a line because each month is a total of its own,
 * not a reading on a continuous measure. `average` lays a dashed rule at
 * the mean, which is the comparison every month is silently being held
 * to. `partialLast` greys the final column: the current month is not
 * over, and drawing it at full strength reads as a collapse.
 */
export function ColumnsChart({
  data,
  color = "var(--cobalt)",
  ariaLabel,
  height = 160,
  average = false,
  partialLast = false,
}: {
  data: Point[];
  color?: string;
  ariaLabel: string;
  height?: number;
  average?: boolean;
  partialLast?: boolean;
}) {
  const definition = useMemo(() => {
    const last = data.at(-1)?.label;
    const settled = partialLast ? data.slice(0, -1) : data;
    const mean = settled.length
      ? settled.reduce((sum, d) => sum + d.value, 0) / settled.length
      : 0;
    return defineChart({
      marks: [
        barY(data, {
          x: "label",
          y: "value",
          fill: (d: Point) =>
            partialLast && d.label === last
              ? `color-mix(in oklab, ${color} 35%, var(--sunk))`
              : color,
          radius: 3,
          maxThickness: 26,
        }),
        ...(average && mean > 0
          ? [ruleY([mean], { stroke: "var(--ink-2)", strokeOpacity: 0.6, strokeDasharray: "3 4" })]
          : []),
      ],
      x: { scale: () => scaleBand<string>().padding(0.3) },
      y: {
        scale: scaleLinear,
        nice: true,
        grid: true,
        axis: { ticks: { count: 3, format: compact } },
      },
      focus: "nearest-x",
      tooltip,
    });
  }, [data, color, average, partialLast]);

  return (
    <div className="chart-quiet chart-rise">
      <Chart definition={definition} ariaLabel={ariaLabel} height={height} />
    </div>
  );
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

  return (
    <div className="chart-draw">
      <Chart definition={definition} ariaLabel={ariaLabel} height={height} />
    </div>
  );
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

  return (
    <div className="chart-draw">
      <Chart definition={definition} ariaLabel={ariaLabel} height={height} />
    </div>
  );
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
  grid = true,
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
            radius: 3,
            // The dashboard's column: the same corner and gutter, so a
            // stack on the attendance page and a month of giving on the
            // dashboard read as one family.
            maxThickness: 40,
            layout: stack(),
          }),
        ],
        x: { scale: () => scaleBand<string>().padding(0.3) },
        y: { scale: scaleLinear, nice: true, grid, axis: { ticks: { count: 3, format: compact } } },
        color: { scale: () => scaleOrdinal<string, string>(domain, colors) },
        focus: "group-x",
        tooltip,
      }),
    [data, colors, domain, grid],
  );

  return (
    <div className="chart-quiet chart-rise">
      <Chart definition={definition} ariaLabel={ariaLabel} height={height} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* composition                                                         */
/* ------------------------------------------------------------------ */

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
  thickness = 0.34,
}: {
  data: Point[];
  colors?: string[];
  ariaLabel: string;
  height?: number;
  thickness?: number;
}) {
  const definition = useMemo(() => {
    /*
     * A split ring: each slice its own rounded band with a clear gap
     * either side, rather than wedges butted together and outlined.
     *
     * The gap is cut by `pie` (`gapAngle`), not by a stroke in the panel's
     * colour — a stroke read as a hard rule round every wedge in dark
     * mode. The corner radius is half the band, so each end is a full
     * round cap; d3 shrinks it on a slice too short to hold one, so a
     * sliver stays a dot instead of turning inside out. One slice is the
     * whole ring and gets no gap.
     */
    const parts = data.filter((d) => d.value > 0).length;
    const slices = pie(data, {
      value: (d: Point) => d.value,
      gapAngle: parts > 1 ? 0.07 : 0,
    });
    return defineChart({
      marks: [
        polar({
          marks: [
            radialArc(slices, {
              key: (d) => d.label,
              fill: (d) => colors[d.index % colors.length],
              innerRadius: ({ radius }) => radius * (1 - thickness),
              outerRadius: ({ radius }) => radius,
              cornerRadius: ({ radius }) => (radius * thickness) / 2,
              strokeWidth: 0,
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
