import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["pdf-parse", "tesseract.js", "mammoth"],
  async redirects() {
    return [
      { source: "/audit", destination: "/workbench", permanent: false },
      { source: "/documents", destination: "/workbench", permanent: false },
      { source: "/risk", destination: "/workbench", permanent: false },
      { source: "/rubric", destination: "/settings", permanent: false },
      { source: "/reports", destination: "/", permanent: false },
      { source: "/managing-agents", destination: "/", permanent: false },
      { source: "/audit-rubric", destination: "/workbench", permanent: false },
    ]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
