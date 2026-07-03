/** Welcome / upstream base for canonical entity handoff. */
export function welcomeOrigin(): string | null {
  for (const key of ["SEARCH_UPSTREAM_BASE_URL", "RETROVERSE_WELCOME_URL"]) {
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
