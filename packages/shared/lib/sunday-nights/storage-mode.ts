/** Production (Vercel) uses Postgres + bundled snapshots; local dev uses JSON + MyLists. */

export function usePostgresSundayNightsState(): boolean {
  const override = process.env.SUNDAY_NIGHTS_STATE_PG?.trim();
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
