/** Placeholder substitutions so dynamic routes can still open / capture. */
const ROUTE_PLACEHOLDERS: Record<string, string> = {
  "[year]": "1985",
  "[rvtr]": "RVTR044043",
  "[serial]": "DEMO0001",
  "[id]": "demo",
  "[workspaceId]": "demo",
};

export function resolveOpenHref(route: string | null): string | null {
  if (!route) return null;
  let href = route;
  for (const [token, value] of Object.entries(ROUTE_PLACEHOLDERS)) {
    href = href.split(token).join(value);
  }
  if (href.includes("[")) return null;
  return href;
}

export function isCapturable(route: string | null, openHref: string | null): {
  capturable: boolean;
  captureBlockReason: string | null;
} {
  if (!route) {
    return { capturable: false, captureBlockReason: "No route — surface is service/panel-only." };
  }
  if (!openHref) {
    return {
      capturable: false,
      captureBlockReason: "Route still contains unresolved dynamic segments.",
    };
  }
  return { capturable: true, captureBlockReason: null };
}
