/**
 * Retroverse runtime site mode — public patron site vs local operator studio.
 *
 * Explicit override only:
 *   RETROVERSE_SITE_MODE=public | studio
 */

export type SiteMode = "public" | "studio";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

const PRODUCTION_HOSTS = new Set(["retroverse.live"]);

/** Strip port and leading www. */
export function normalizeHost(host: string): string {
  const trimmed = host.trim().toLowerCase();
  const withoutPort = trimmed.split(":")[0] ?? trimmed;
  return withoutPort.replace(/^www\./, "");
}

function inferServerHost(): string {
  const raw =
    process.env.RETROVERSE_PUBLIC_HOST?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "";

  if (!raw) return "";
  if (raw.includes("://")) {
    try {
      return new URL(raw).hostname;
    } catch {
      return raw;
    }
  }
  return raw;
}

function hostIsLocal(host: string): boolean {
  if (!host) return false;
  if (LOCAL_HOSTS.has(host)) return true;
  return host.endsWith(".localhost");
}

function hostIsProductionPublic(host: string): boolean {
  if (!host) return false;
  if (PRODUCTION_HOSTS.has(host)) return true;
  return host.endsWith(".retroverse.live");
}

/** Resolve site mode from explicit env override, request host, or server env hints. */
export function resolveSiteMode(input?: { host?: string | null }): SiteMode {
  const explicit = process.env.RETROVERSE_SITE_MODE?.trim().toLowerCase();
  if (explicit === "public" || explicit === "studio") {
    return explicit;
  }

  const host = normalizeHost(input?.host ?? inferServerHost());
  if (hostIsLocal(host)) return "studio";
  if (hostIsProductionPublic(host)) return "public";

  // Unknown host: block ops in production builds; allow local dev defaults.
  if (process.env.NODE_ENV === "production") return "public";
  return "studio";
}

export function isProductionPublic(host?: string | null): boolean {
  return resolveSiteMode({ host }) === "public";
}

export function isLocalStudio(host?: string | null): boolean {
  return resolveSiteMode({ host }) === "studio";
}

/** Gate for /ops, /api/ops, diagnostics, and operator tooling. */
export function shouldAllowOpsRoutes(host?: string | null): boolean {
  return resolveSiteMode({ host }) === "studio";
}

/** Path prefixes blocked on the public production site. */
export const LOCAL_ONLY_PATH_PREFIXES = [
  "/local",
  "/bobos",
  "/ops",
  "/diagnostics",
  "/internal/ops-pin",
  "/api/ops",
  "/api/internal/ops-auth",
  "/inspect",
  "/database-explorer",
  "/control-center",
] as const;

export function isLocalOnlyPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return LOCAL_ONLY_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Patron-facing routes that must remain available on retroverse.live. */
export const PUBLIC_ROUTE_PREFIXES = [
  "/",
  "/live",
  "/search",
  "/charts",
  "/artist/",
  "/album/",
  "/track/",
  "/experience/",
  "/retroverse-2/",
  "/retroverse/",
  "/sunday-nights",
  "/rv/",
  "/week/",
  "/rvtr/",
] as const;

/** Public APIs required by the patron site (not operator tooling). */
export const PUBLIC_API_PREFIXES = [
  "/api/search",
  "/api/charts/",
  "/api/chart-journey",
  "/api/events",
  "/api/experience/",
  "/api/live-now-playing",
  "/api/playback/",
  "/api/retroverse-2/",
  "/api/sunday-nights/",
] as const;

export function isPublicApiPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return PUBLIC_API_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix),
  );
}
