/** Local graph inspector — disabled in production unless explicitly enabled. */
export function isInspectEnabled(): boolean {
  const flag = process.env.RETROVERSE_INSPECT?.trim();
  if (flag === "0") return false;
  if (flag === "1") return true;
  return process.env.NODE_ENV !== "production";
}
