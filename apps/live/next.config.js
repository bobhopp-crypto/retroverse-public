const path = require("path");

const isDev = process.env.NODE_ENV === "development";
const STUDIO_DEV_ORIGIN =
  process.env.RETROVERSE_STUDIO_ORIGIN?.trim() || "http://localhost:3000";

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

// Internal path prefixes that live on the Studio app. In production the public
// site sends them home (same behavior as the old middleware); in local dev they
// proxy to the Studio dev server so operator links keep working.
const STUDIO_PREFIXES = [
  "/ops",
  "/bobos",
  "/local",
  "/diagnostics",
  "/internal",
  "/inspect",
  "/database-explorer",
  "/control-center",
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Scope traces to this app — monorepo root tracing pulled in 60k+
  // data/ops/intelligence/research-department files and blew past Vercel's
  // 250 MB function limit. Runtime data lives under apps/live/data (prebuild).
  outputFileTracingRoot: __dirname,
  outputFileTracingIncludes: {
    "*": [
      "../../node_modules/next/dist/**",
      "../../node_modules/react/**",
      "../../node_modules/react-dom/**",
      "../../node_modules/styled-jsx/**",
      "../../node_modules/client-only/**",
      "../../node_modules/pg/**",
      "../../node_modules/pg-*/**",
      "../../node_modules/postgres-*/**",
      "../../node_modules/pgpass/**",
      "../../node_modules/split2/**",
      "../../node_modules/xtend/**",
      "../../node_modules/sharp/**",
      "../../node_modules/@img/**",
      "../../node_modules/detect-libc/**",
      "../../node_modules/semver/**",
      "./data/album-chart-features.json",
    ],
    "/api/retroverse-2/attract-tour": ["./data/ops/studio/**"],
    "/album/[id]": ["./data/album-chart-features.json"],
    "/retroverse-2/song/[rvtr]": ["./data/rvbr/**"],
    "/song/vdj/[key]": [
      "./data/ops/manifest/c2-final-editor-backlog.json",
      "./data/reports/c2-terra-editor-proof-25/terra-editor-manifest.json",
      "./data/ops/intelligence/research-department/VDJ-54eaeb091e524d3b/**",
    ],
    "/": [
      "./data/ops/manifest/c2-final-editor-backlog.json",
      "./data/reports/c2-terra-editor-proof-25/terra-editor-manifest.json",
      "./data/ops/intelligence/research-department/VDJ-54eaeb091e524d3b/**",
    ],
    "/api/experience/visual-asset": [
      "./data/ops/intelligence/research-department/VDJ-54eaeb091e524d3b/**",
    ],
  },
  outputFileTracingExcludes: {
    "*": [
      "./data/ops/intelligence/**",
      "./data/ops/studio/publisher-records.json",
      "./.next/cache/**",
      "./.vercel/**",
    ],
    "/api/events/**": ["./data/ops/intelligence/**"],
  },
  serverExternalPackages: ["pg", "sharp"],
  experimental: {
    externalDir: true,
  },
  async redirects() {
    const audience = [
      { source: "/live", destination: "/", permanent: false },
      { source: "/sunday-nights", destination: "/", permanent: false },
      { source: "/retroverse-2/live", destination: "/", permanent: false },
      { source: "/retroverse-live", destination: "/", permanent: false },
    ];
    const browse = [
      { source: "/browse/artists", destination: "/", permanent: false },
      { source: "/browse/albums", destination: "/", permanent: false },
      { source: "/browse/tracks", destination: "/", permanent: false },
      { source: "/browse/:path*", destination: "/", permanent: false },
    ];
    if (isDev) return [...audience, ...browse];
    // Production: internal tools are not part of this deployment — send home.
    const internal = STUDIO_PREFIXES.flatMap((prefix) => [
      { source: prefix, destination: "/", permanent: false },
      { source: `${prefix}/:path*`, destination: "/", permanent: false },
    ]);
    return [...audience, ...browse, ...internal];
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
      // Local dev: operator paths proxy to the Studio dev server.
      for (const prefix of [...STUDIO_PREFIXES, "/api/ops", "/api/bobos", "/api/internal", "/api/inspect", "/api/healing"]) {
        fallback.push({
          source: `${prefix}/:path*`,
          destination: `${STUDIO_DEV_ORIGIN}${prefix}/:path*`,
        });
        fallback.push({ source: prefix, destination: `${STUDIO_DEV_ORIGIN}${prefix}` });
      }
    }
    return { beforeFiles, afterFiles: [], fallback };
  },
};

module.exports = nextConfig;
