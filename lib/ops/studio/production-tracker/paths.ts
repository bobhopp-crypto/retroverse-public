export function productionTrackerPath(rvtr: string): string {
  return `/ops/studio/track/${rvtr.trim().toUpperCase()}`;
}
