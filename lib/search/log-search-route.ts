/** Client/server-safe routing diagnostics for search → entity navigation. */

export function warnSearchRouteIssue(
  context: string,
  detail: Record<string, unknown>,
): void {
  console.warn(`[search-route:${context}]`, detail);
}
