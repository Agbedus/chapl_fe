/**
 * Sample congregation for the marketing site. Generated from a fixed seed so
 * the server and the client draw exactly the same church, and so every number
 * quoted on the page is counted from the same data the dots are drawn from.
 */

export type Cell = {
  id: string;
  name: string;
  members: number;
  present: number;
};

export type Branch = {
  id: string;
  name: string;
  area: string;
  color: string;
  cells: Cell[];
  members: number;
  present: number;
};

function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BRANCHES = [
  { id: "central", name: "Central", area: "Osu", color: "var(--cobalt)" },
  { id: "adenta", name: "Adenta", area: "Adenta", color: "var(--violet)" },
  { id: "tema", name: "Tema", area: "Community 7", color: "var(--teal)" },
  { id: "airport", name: "Airport Hills", area: "Airport", color: "var(--emerald)" },
  { id: "madina", name: "Madina", area: "Madina", color: "var(--gold)" },
  { id: "kasoa", name: "Kasoa", area: "Kasoa", color: "var(--ruby)" },
];

const CELL_NAMES = [
  "Cornerstone", "Wellspring", "Anchor", "Harvest", "Lamplight", "Rooftop",
  "Olive", "Bethany", "Ridge", "Kindred", "Seedbed", "Watchtower",
  "Hearth", "Trellis", "Threshold", "Almond",
];

function build(): Branch[] {
  const random = mulberry32(0x63686170);

  return BRANCHES.map((meta, b) => {
    const cellCount = 12 + Math.floor(random() * 4); // 12–15 cells per branch
    const cells: Cell[] = Array.from({ length: cellCount }, (_, c) => {
      const members = 6 + Math.floor(random() * 9); // 6–14 people per cell
      const present = Math.round(members * (0.58 + random() * 0.32));
      return {
        id: `${meta.id}-${c}`,
        name: `${CELL_NAMES[(b * 5 + c) % CELL_NAMES.length]} ${c + 1}`,
        members,
        present,
      };
    });

    return {
      ...meta,
      cells,
      members: cells.reduce((n, cell) => n + cell.members, 0),
      present: cells.reduce((n, cell) => n + cell.present, 0),
    };
  });
}

export const branches = build();

export const totals = {
  branches: branches.length,
  cells: branches.reduce((n, b) => n + b.cells.length, 0),
  members: branches.reduce((n, b) => n + b.members, 0),
  present: branches.reduce((n, b) => n + b.present, 0),
};

export const churchName = "Grace Chapel";
