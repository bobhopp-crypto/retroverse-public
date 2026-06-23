/** Primary patron live destination — existing Song Experience route. */
export function liveSongExperienceHref(rvtr: string): string {
  return `/retroverse-2/song/${rvtr.trim().toUpperCase()}`;
}

export function shouldOpenSongExperienceDirect(input: {
  channelRunning?: boolean;
  liveSource?: string | null;
}): boolean {
  if (input.channelRunning) return true;
  if (input.liveSource === "channel" || input.liveSource === "bridge") return true;
  return false;
}
