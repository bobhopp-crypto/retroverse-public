const path = require("path");

const isDev = process.env.NODE_ENV === "development";
const LIVE_DEV_ORIGIN =
  process.env.RETROVERSE_LIVE_ORIGIN?.trim() || "http://localhost:3100";

function coverProxyOrigin() {
  for (const key of [
    "COVER_PROXY_ORIGIN",
    "SEARCH_UPSTREAM_BASE_URL",
    "RETROVERSE_WELCOME_URL",
  ]) {
    const raw = process.env[key];
    if (typeof raw === "string" && raw.trim()) {
      return raw.trim().replace(/\/+$/, "");
    }
  }
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3001";
  }
  return null;
}

// Public patron paths that live on the Live app. In local dev, unmatched
// requests for them proxy to the Live dev server so operator links keep working.
const LIVE_PREFIXES = [
  "/artist",
  "/album",
  "/track",
  "/search",
  "/charts",
  "/rv",
  "/rvtr",
  "/week",
  "/experience",
  "/giveaway",
  "/pass",
  "/live",
  "/retroverse",
  "/retroverse-2",
  "/retroverse-live",
  "/sunday-nights",
  "/index",
  "/api/search",
  "/api/charts",
  "/api/chart-journey",
  "/api/events",
  "/api/experience",
  "/api/giveaway",
  "/api/live-now-playing",
  "/api/playback",
  "/api/retroverse-2",
  "/api/retroverse-live",
  "/api/sunday-nights",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  outputFileTracingIncludes: {
    "/api/ops/**": [
      "./data/ops/intelligence/research-department/*.json",
      "./data/ops/studio/**",
    ],
    "/ops/**": [
      "./data/ops/intelligence/research-department/*.json",
      "./data/ops/studio/**",
    ],
  },
  outputFileTracingExcludes: {
    "*": [
      "./data/ops/intelligence/research-department/RVTR*/**",
      "./data/ops/studio/publisher-records.json",
      "./data/ops/intelligence/packages/**",
      "./data/finance-imports/**",
      "./data/ops/allstar/**",
    ],
  },
  serverExternalPackages: ["pg"],
  // Ops video uploads hit /api/ops/* (middleware matcher). Default 10MB truncates
  // multipart bodies and breaks req.formData() for Media Lab transcripts.
  experimental: {
    externalDir: true,
    middlewareClientMaxBodySize: "2gb",
  },
  async redirects() {
    return [
      { source: "/ops/finance/import-amazon", destination: "/ops/finance/import", permanent: false },
      { source: "/ops/finance/import/amazon", destination: "/ops/finance/import", permanent: false },
      { source: "/ops/finance/import/nebat", destination: "/ops/finance/import", permanent: false },
      { source: "/ops/finance/ledger", destination: "/ops/finance/reports/ledger", permanent: false },
      { source: "/ops/finance/review", destination: "/ops/finance/import", permanent: false },
      { source: "/ops/finance/merchants", destination: "/ops/finance/reports/merchants", permanent: false },
      { source: "/ops/finance/accounts", destination: "/ops/finance/reports/chart-of-accounts", permanent: false },
      { source: "/control-center", destination: "/ops", permanent: false },
      { source: "/control-center/:path*", destination: "/ops", permanent: false },
      { source: "/ops/map", destination: "/ops/atlas/system", permanent: false },
      { source: "/ops/map/:path*", destination: "/ops/atlas/system", permanent: false },
      { source: "/ops/atlas/library", destination: "/ops/library", permanent: false },
      { source: "/ops/atlas/library/:path*", destination: "/ops/library", permanent: false },
      { source: "/ops/event-studio/print", destination: "/ops/event-studio/create", permanent: false },
      {
        source: "/ops/event-studio/print/pass-generator",
        destination: "/bobos/passes",
        permanent: false,
      },
      { source: "/ops/event-studio/branding", destination: "/ops/event-studio/identity", permanent: false },
      { source: "/ops/event-studio/digital", destination: "/ops/event-studio/publish", permanent: false },
      { source: "/ops/event-studio/audience", destination: "/ops/event-studio/giveaway/audience", permanent: false },
      { source: "/ops/event-studio/ai", destination: "/ops/event-studio/identity", permanent: false },
      {
        source: "/ops/content-creator/create",
        destination: "/bobos/passes",
        permanent: false,
      },
      {
        source: "/ops/content-creator/create/:path*",
        destination: "/bobos/passes",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    const beforeFiles = [];
    const origin = coverProxyOrigin();
    if (origin) {
      beforeFiles.push({
        source: "/retroverse/covers/:path*",
        destination: `${origin}/retroverse/covers/:path*`,
      });
    }
    const fallback = [];
    if (isDev) {
      // Local dev: patron paths proxy to the Live dev server.
      fallback.push({ source: "/", destination: `${LIVE_DEV_ORIGIN}/` });
      for (const prefix of LIVE_PREFIXES) {
        fallback.push({
          source: `${prefix}/:path*`,
          destination: `${LIVE_DEV_ORIGIN}${prefix}/:path*`,
        });
        fallback.push({ source: prefix, destination: `${LIVE_DEV_ORIGIN}${prefix}` });
      }
    }
    return { beforeFiles, afterFiles: [], fallback };
  },
};

module.exports = nextConfig;
