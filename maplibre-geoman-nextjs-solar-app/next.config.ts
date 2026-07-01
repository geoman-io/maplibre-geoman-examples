import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app intentionally keeps its own lockfile (private @geoman-io registry),
  // so pin the workspace root here to stop Next inferring the parent repo.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
