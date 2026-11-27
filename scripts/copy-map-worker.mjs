// MapLibre GL starts its tile worker from a file beside its own module,
// which the bundler does not emit. This copies that worker into public/
// under its version, so `setWorkerUrl` can point at a stable path and a
// new version never serves an old worker from cache. Runs on install,
// before dev and before build; the copy is gitignored.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const from = join(dirname(pkgPath), "dist", "maplibre-gl-worker.mjs");
const to = join(process.cwd(), "public", "vendor", `maplibre-gl-worker-${version}.mjs`);
mkdirSync(dirname(to), { recursive: true });
copyFileSync(from, to);
console.log(`map worker → public/vendor/maplibre-gl-worker-${version}.mjs`);
