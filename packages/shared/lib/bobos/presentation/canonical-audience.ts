/** Single public audience destination — the live broadcast at retroverse.live. */
export const CANONICAL_AUDIENCE_HREF = "/";

export function isLiveBroadcastPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? "/";
  return path === "/";
}
