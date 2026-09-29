/** Production uses the existing small Redis state store; local dev uses JSON. */

export function useRemoteSundayNightsState(): boolean {
  const override = process.env.SUNDAY_NIGHTS_STATE_REDIS?.trim();
  if (override === "1") return true;
  if (override === "0") return false;
  return process.env.VERCEL === "1";
}

export function useSundayNightsSnapshots(): boolean {
  const override = process.env.SUNDAY_NIGHTS_USE_SNAPSHOTS?.trim();
  if (override === "1") return true;
  if (override === "0") return false;
  return process.env.VERCEL === "1";
}
