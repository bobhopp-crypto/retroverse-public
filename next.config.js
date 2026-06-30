const path = require("path");

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

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  // Trace only small ops metadata — not per-RVTR package trees (45k+ files OOM Vercel builds).
  outputFileTracingIncludes: {
    "/api/ops/**": [
      "./data/ops/intelligence/research-department/*.json",
      "./data/ops/studio/**",
    ],
    "/api/retroverse-2/attract-tour": ["./data/ops/studio/**"],
    "/ops/**": [
      "./data/ops/intelligence/research-department/*.json",
      "./data/ops/studio/**",
    ],
  },
  outputFileTracingExcludes: {
    "*": [
      "./data/ops/intelligence/research-department/RVTR*/**",
      "./.venv-allstar/**",
      "./tools/allstar-disc-extractor/**",
    ],
  },
  serverExternalPackages: ["pg"],
  // Ops video uploads hit /api/ops/* (middleware matcher). Default 10MB truncates
  // multipart bodies and breaks req.formData() for Media Lab transcripts.
  experimental: {
    middlewareClientMaxBodySize: "2gb",
  },
  async redirects() {
    return [
      { source: "/browse/artists", destination: "/", permanent: false },
      { source: "/browse/albums", destination: "/", permanent: false },
      { source: "/browse/tracks", destination: "/", permanent: false },
      { source: "/browse/:path*", destination: "/", permanent: false },
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
        destination: "/ops/event-studio/create/pass-generator",
        permanent: false,
      },
      { source: "/ops/event-studio/branding", destination: "/ops/event-studio/identity", permanent: false },
      { source: "/ops/event-studio/digital", destination: "/ops/event-studio/publish", permanent: false },
      { source: "/ops/event-studio/giveaway", destination: "/ops/event-studio/audience", permanent: false },
      { source: "/ops/event-studio/ai", destination: "/ops/event-studio/identity", permanent: false },
    ];
  },
  async rewrites() {
    const origin = coverProxyOrigin();
    if (!origin) return [];
    return [
      {
        source: "/retroverse/covers/:path*",
        destination: `${origin}/retroverse/covers/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
