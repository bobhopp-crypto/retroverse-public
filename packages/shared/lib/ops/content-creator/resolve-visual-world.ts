import { normalizeVisualWorldId, type VisualWorldId } from "@/lib/ops/creative-lab/visual-worlds";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

/** Era slug → visual world. No era should silently fall back to MTV. */
const ERA_WORLD_MAP: Record<string, VisualWorldId> = {
  "1958-1961": "vintage-television",
  "1962-1965": "collector-memorabilia",
  "1966-1969": "psychedelic-festival",
  "1970-1973": "psychedelic-festival",
  "1974-1977": "rock-poster",
  "1978-1981": "vintage-television",
  "1982-1985": "music-television-credential",
  "1986-1989": "concert-backstage-laminate",
  "1990-1993": "rock-poster",
  "1994-1997": "rock-poster",
  "1998-2001": "collector-memorabilia",
  "2002-2005": "concert-backstage-laminate",
  "2006-2009": "music-television-credential",
  "2010-2013": "concert-backstage-laminate",
  "2014-2017": "collector-memorabilia",
  "2018-2021": "concert-backstage-laminate",
  "2022-2025": "collector-memorabilia",
};

function inferWorldFromYears(start: number): VisualWorldId {
  if (start < 1966) return "vintage-television";
  if (start < 1974) return "psychedelic-festival";
  if (start < 1982) return "rock-poster";
  if (start < 1990) return "music-television-credential";
  if (start < 1998) return "rock-poster";
  return "collector-memorabilia";
}

/** Pick visual world from RVBR — explicit era map first, then promptFragments, then year inference. */
export function resolveVisualWorldFromRvbr(profile: RvbrProfile | null): VisualWorldId {
  if (!profile) return "vintage-television";

  const mapped = ERA_WORLD_MAP[profile.slug];
  if (mapped) return mapped;

  for (const id of profile.promptFragments.visualWorlds ?? []) {
    const normalized = normalizeVisualWorldId(id);
    if (normalized) return normalized;
  }

  return inferWorldFromYears(profile.eraStartYear);
}
