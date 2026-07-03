/** Internal launchpad — disabled in production unless explicitly enabled. */
export function isControlCenterEnabled(): boolean {
  const flag = process.env.RETROVERSE_CONTROL_CENTER?.trim();
  if (flag === "0") return false;
  if (flag === "1") return true;
  return process.env.NODE_ENV !== "production";
}
