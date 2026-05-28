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
  serverExternalPackages: ["pg"],
  async redirects() {
    return [
      { source: "/browse/artists", destination: "/", permanent: false },
      { source: "/browse/albums", destination: "/", permanent: false },
      { source: "/browse/tracks", destination: "/", permanent: false },
      { source: "/browse/:path*", destination: "/", permanent: false },
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
