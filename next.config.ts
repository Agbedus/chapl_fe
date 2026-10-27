import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't walk up past this project
  // looking for a lockfile.
  turbopack: { root: __dirname },
  experimental: {
    // A page visited in the last half minute opens from the browser's own
    // copy, then catches up: back and forward between two screens is
    // instant. Any Server Action that writes clears it.
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
