/** Song experience URL — library discovery only; live audience is at /. */
export function liveSongExperienceHref(rvtr: string): string {
  return `/retroverse-2/song/${rvtr.trim().toUpperCase()}`;
}

/** @deprecated Live audience routes to the Broadcast player. */
export function shouldOpenSongExperienceDirect(_input: {
  channelRunning?: boolean;
  liveSource?: string | null;
}): boolean {
  return false;
}
