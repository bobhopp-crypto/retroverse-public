import { loadEventControlConfig } from "@/lib/ops/event-control/store";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

import type { AtlasRealities } from "./types";

function showFloorLabel(live: { artist: string; title: string } | null, trackId: string | null): string {
  if (live) return `${live.artist} — ${live.title}`;
  if (trackId) return `Track · ${trackId}`;
  return "Idle";
}

function programLabel(featuredYears: number[], mode: string): string {
  const years = featuredYears.length ? featuredYears.join(" · ") : "—";
  return `${mode} · ${years}`;
}

/** Static-first realities plaque — studio side uses local loaders; stage uses prototype defaults. */
export async function loadAtlasRealities(): Promise<AtlasRealities> {
  const [localState, eventConfig] = await Promise.all([
    loadSundayNightsState(),
    loadEventControlConfig(),
  ]);

  const studioShowFloor = showFloorLabel(localState.live, localState.currentTrackId);
  const program = programLabel(eventConfig.featuredYears, eventConfig.homepage.mode);

  return {
    studio: {
      headline: "Your desk · working on 1970s missions",
      showFloor: studioShowFloor,
      program,
      blueprint: "2 changes not on stage",
    },
    stage: {
      headline: "Visitors · retroverse.live",
      showFloor: "Idle",
      program,
      blueprint: "Deployed yesterday",
    },
    alignment: "Different",
    syncStatus: "Sync First",
    deployReadiness: "Good To Go",
  };
}
