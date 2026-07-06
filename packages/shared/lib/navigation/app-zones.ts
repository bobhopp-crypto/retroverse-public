/** Retroverse application zones — global navigation architecture. */

export type AppZoneId = "public" | "live" | "studio" | "command" | "diagnostics";

export type AppZone = {
  id: AppZoneId;
  label: string;
  href: string;
  description: string;
  /** Visible in primary nav without authentication. */
  publicNav: boolean;
  /** Requires RETROVERSE_OPS=1. */
  requiresOps: boolean;
  /** Requires ops PIN cookie before direct entry. */
  requiresAuth: boolean;
};

export const APP_ZONES: AppZone[] = [
  {
    id: "public",
    label: "Public",
    href: "/",
    description: "Discovery, search, artists, albums, and charts.",
    publicNav: false,
    requiresOps: false,
    requiresAuth: false,
  },
  {
    id: "live",
    label: "Live",
    href: "/",
    description: "Live channel and now playing.",
    publicNav: false,
    requiresOps: false,
    requiresAuth: false,
  },
  {
    id: "studio",
    label: "Research Studio",
    href: "/ops/studio",
    description: "AI departments and publishing workflows.",
    publicNav: false,
    requiresOps: true,
    requiresAuth: true,
  },
  {
    id: "command",
    label: "Command Center",
    href: "/ops",
    description: "Operations, shows, library, and infrastructure.",
    publicNav: false,
    requiresOps: true,
    requiresAuth: true,
  },
  {
    id: "diagnostics",
    label: "Diagnostics",
    href: "/diagnostics",
    description: "Database Explorer and system health.",
    publicNav: false,
    requiresOps: true,
    requiresAuth: true,
  },
];

const PUBLIC_PATH_PREFIXES = [
  "/search",
  "/artist/",
  "/album/",
  "/track/",
  "/rv/",
  "/week/",
  "/retroverse-2/charts",
  "/retroverse-2/song/",
];

const LIVE_PATH_PREFIXES = ["/live", "/sunday-nights", "/retroverse-live", "/retroverse-2/live"];

export function detectAppZone(pathname: string): AppZoneId {
  const path = pathname.split("?")[0] ?? "/";

  if (path.startsWith("/ops/studio")) return "studio";
  if (path.startsWith("/ops") || path === "/internal/ops-pin") return "command";
  if (
    path.startsWith("/database-explorer") ||
    path.startsWith("/inspect") ||
    path.startsWith("/control-center") ||
    path.startsWith("/diagnostics")
  ) {
    return "diagnostics";
  }

  if (LIVE_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return "live";
  }

  if (path === "/" || PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return "public";
  }

  return "public";
}

export function zoneById(id: AppZoneId): AppZone {
  return APP_ZONES.find((zone) => zone.id === id) ?? APP_ZONES[0]!;
}

export function zoneHref(zone: AppZone, opsAuthenticated: boolean): string {
  if (zone.requiresAuth && !opsAuthenticated) {
    return `/internal/ops-pin?next=${encodeURIComponent(zone.href)}`;
  }
  return zone.href;
}

export function visibleNavZones(input: {
  opsEnabled: boolean;
  opsAuthenticated: boolean;
}): AppZone[] {
  return APP_ZONES.filter((zone) => {
    if (zone.publicNav) return true;
    if (!input.opsEnabled) return false;
    return input.opsAuthenticated;
  });
}

export function adminMenuZones(opsEnabled: boolean): AppZone[] {
  if (!opsEnabled) return [];
  return APP_ZONES.filter((zone) => zone.requiresOps);
}
