const RE_RVTR = /^RVTR\d{6}$/i;

/** Canonical Public V3 Song Experience href for a resolved id. */
export function channelZeroSongExperienceHref(experienceId: string): string {
  const raw = experienceId.trim();
  if (RE_RVTR.test(raw)) {
    return `/retroverse-2/song/${encodeURIComponent(raw.toUpperCase())}`;
  }
  if (raw.toLowerCase().startsWith("vdj:")) {
    return `/song/vdj/${encodeURIComponent(raw.slice(4))}`;
  }
  return `/retroverse-2/song/${encodeURIComponent(raw)}`;
}
