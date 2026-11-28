import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't walk up past this project
  // looking for a lockfile.
  turbopack: { root: __dirname },
  experimental: {
    // A development tunnel (VS Code's, say) forwards a different Origin
    // from the Host, which Server Actions refuse. Name its host in
    // DEV_ORIGINS (comma-separated) in .env.local; nothing in production.
    serverActions: {
      allowedOrigins:
        process.env.NODE_ENV === "development"
          ? ["localhost:3000", ...(process.env.DEV_ORIGINS ?? "").split(",").map((o) => o.trim()).filter(Boolean)]
          : [],
    },
    // A page visited in the last half minute opens from the browser's own
    // copy, then catches up: back and forward between two screens is
    // instant. Any Server Action that writes clears it.
    staleTimes: { dynamic: 30, static: 300 },
  },
};

export default nextConfig;
