import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't walk up past this project
  // looking for a lockfile.
  turbopack: { root: __dirname },
};

export default nextConfig;
