import type { PublicHomepagePayload } from "@/lib/home/public-current-song";
import type { HomepageHero } from "@/lib/event-control";

export type HomepageRegion = "hero" | "panelA" | "panelB" | "chyron";

export type HomepagePanel = {
  id: string;
  label: string;
  title: string;
  href?: string | null;
};

export type HomepageAuthorityOverrides = {
  hero: HomepageHero | null;
  panelA: HomepagePanel | null;
  panelB: HomepagePanel | null;
  chyron: string | null;
};

export const EMPTY_HOMEPAGE_AUTHORITY_OVERRIDES: HomepageAuthorityOverrides = {
  hero: null,
  panelA: null,
  panelB: null,
  chyron: null,
};

export type HomepageAuthorityInputs = {
  /** Existing VDJ/current-song public loader output. */
  currentSong: PublicHomepagePayload;
  /** Existing automatic hero pipeline output; no hero storage is introduced here. */
  automaticHero: HomepageHero | null;
  /** Existing event-controlled panel selections. */
  automaticPanelA?: HomepagePanel | null;
  automaticPanelB?: HomepagePanel | null;
  overrides?: Partial<HomepageAuthorityOverrides>;
};

export type HomepageAuthoritySnapshot = {
  hero: HomepageHero | null;
  musicIdentity: {
    song: string | null;
    artist: string | null;
    album: string | null;
    year: number | null;
    rvtr: string | null;
  };
  panelA: HomepagePanel | null;
  panelB: HomepagePanel | null;
  chyron: string;
  chyronMode: "automatic" | "manual";
  heroMode: "automatic" | "manual";
  panelAMode: "automatic" | "manual";
  panelBMode: "automatic" | "manual";
};

function text(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function identity(currentSong: PublicHomepagePayload): HomepageAuthoritySnapshot["musicIdentity"] {
  const song = currentSong.publicSong;
  const track = currentSong.track ?? song?.track ?? null;
  const live = currentSong.live;
  const rvba = currentSong.manualOverride?.rvba;
  return {
    song: text(song?.title ?? track?.title ?? live?.title ?? rvba?.title),
    artist: text(song?.artist ?? track?.artistName ?? live?.artist ?? rvba?.subtitle),
    album: text(song?.album ?? track?.primaryAlbum?.title),
    year: song?.year ?? track?.releaseYear ?? live?.year ?? null,
    rvtr: text(song?.rvtr ?? track?.rvtr ?? live?.rvtr ?? currentSong.currentTrackId),
  };
}

function manual<T>(override: T | null | undefined, automatic: T | null): { value: T | null; mode: "automatic" | "manual" } {
  return override === undefined || override === null
    ? { value: automatic, mode: "automatic" }
    : { value: override, mode: "manual" };
}

/**
 * The single homepage decision function. It reads existing service outputs and
 * applies temporary overrides; it does not read or write a new store.
 */
export function resolveHomepageAuthority(input: HomepageAuthorityInputs): HomepageAuthoritySnapshot {
  const overrides = input.overrides ?? {};
  const hero = manual(overrides.hero, input.automaticHero);
  const panelA = manual(overrides.panelA, input.automaticPanelA ?? null);
  const panelB = manual(overrides.panelB, input.automaticPanelB ?? null);
  const current = identity(input.currentSong);
  return {
    hero: hero.value,
    musicIdentity: current,
    panelA: panelA.value,
    panelB: panelB.value,
    chyron: overrides.chyron ?? "NOW PLAYING...",
    chyronMode: overrides.chyron ? "manual" : "automatic",
    heroMode: hero.mode,
    panelAMode: panelA.mode,
    panelBMode: panelB.mode,
  };
}

export function setHomepageOverride(
  overrides: HomepageAuthorityOverrides,
  region: HomepageRegion,
  value: HomepageHero | HomepagePanel | string | null,
): HomepageAuthorityOverrides {
  if (region === "hero") return { ...overrides, hero: value as HomepageHero | null };
  if (region === "panelA") return { ...overrides, panelA: value as HomepagePanel | null };
  if (region === "panelB") return { ...overrides, panelB: value as HomepagePanel | null };
  return { ...overrides, chyron: value as string | null };
}

export function clearHomepageOverride(
  overrides: HomepageAuthorityOverrides,
  region: HomepageRegion,
): HomepageAuthorityOverrides {
  return setHomepageOverride(overrides, region, null);
}
