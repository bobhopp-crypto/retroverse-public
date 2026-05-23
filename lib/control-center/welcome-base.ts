export function welcomeUpstreamBase(): string {
  return (
    process.env.SEARCH_UPSTREAM_BASE_URL?.trim() ||
    process.env.RETROVERSE_WELCOME_URL?.trim() ||
    (process.env.NODE_ENV === "development" ? "http://localhost:3001" : "")
  );
}

export function welcomeHref(path: string): string {
  const base = welcomeUpstreamBase().replace(/\/$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
