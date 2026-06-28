import "server-only";

import { randomUUID } from "crypto";

import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import { loadDirectorHandoff, loadDirectorPackage } from "@/lib/ops/studio/director/store";
import { exhibitIdFromScene, type ExhibitId } from "@/lib/ops/studio/director/exhibit-plan";
import {
  composeMuseumExperience,
  museumAdjacentDuplicateImages,
} from "@/lib/retroverse/renderer/museum-experience";
import type { MuseumRoom, PresentableScene } from "@/lib/retroverse/renderer/scene-presentation";

import type {
  ExperienceCriticAreaId,
  ExperienceCriticObservation,
  ExperienceCriticReport,
  ExperienceCriticTone,
} from "./types";

function observe(
  area: ExperienceCriticAreaId,
  text: string,
  tone: ExperienceCriticTone,
  exhibitId?: ExhibitId,
): ExperienceCriticObservation {
  return { id: randomUUID(), area, text, tone, ...(exhibitId ? { exhibitId } : {}) };
}

function sceneByRoom(
  scenes: PresentableScene[],
  room: MuseumRoom,
): PresentableScene | undefined {
  return scenes.find((s) => s.museumRoom === room);
}

function primaryImageUrl(scene: PresentableScene | undefined): string | null {
  if (!scene) return null;
  if (scene.coverUrl) return scene.coverUrl;
  if (scene.assets.imageUrls[0]) return scene.assets.imageUrls[0];
  return null;
}

function frameCategoryForAsset(
  collector: NonNullable<Awaited<ReturnType<typeof loadCollectorPackage>>>,
  assetId: string | undefined,
): string | null {
  if (!assetId) return null;
  const perf = collector.performances?.[0];
  const assets =
    perf?.visualAssets.extraction.assets ?? collector.visualAssets.extraction.assets ?? [];
  return assets.find((a) => a.id === assetId)?.category ?? null;
}

function reviewOpening(
  scenes: PresentableScene[],
  collector: NonNullable<Awaited<ReturnType<typeof loadCollectorPackage>>>,
  director: NonNullable<Awaited<ReturnType<typeof loadDirectorPackage>>>,
): ExperienceCriticObservation[] {
  const out: ExperienceCriticObservation[] = [];
  const cover = sceneByRoom(scenes, "cover");
  const chart = sceneByRoom(scenes, "chart_journey");
  const iconic = sceneByRoom(scenes, "iconic_moment");

  if (!cover?.coverUrl) {
    out.push(observe("opening", "Opening could be stronger.", "concern", "cover"));
  }

  const iconicPlan = director.experiencePlan.scenes.find(
    (s) => exhibitIdFromScene(s) === "iconic_moment",
  );
  const iconicCategory = frameCategoryForAsset(
    collector,
    iconicPlan?.linkedImageAssetIds[0],
  );

  if (iconicCategory === "Close-up" || iconicCategory === "Performance") {
    out.push(
      observe(
        "opening",
        "Cover opens on album art while a stronger performance frame sits later — consider leading with curiosity.",
        "note",
        "cover",
      ),
    );
  }

  const chartImage = primaryImageUrl(chart);
  const coverVisual = cover?.coverUrl ?? null;
  if (chartImage && chart?.museumChart && coverVisual) {
    out.push(
      observe(
        "opening",
        "Chart Journey is visually stronger than the Cover.",
        "note",
        "cover",
      ),
    );
  }

  if (iconic?.assets.imageUrls.length && !cover?.showcaseBadge) {
    const iconicHeadline = iconic.headline?.trim();
    if (iconicHeadline && iconicHeadline.length >= 8) {
      out.push(
        observe(
          "opening",
          "Opening creates curiosity — title identity is clear before the story deepens.",
          "praise",
          "cover",
        ),
      );
    }
  }

  return out;
}

function reviewRhythm(scenes: PresentableScene[]): ExperienceCriticObservation[] {
  const out: ExperienceCriticObservation[] = [];
  const adjacentDupes = museumAdjacentDuplicateImages(scenes);

  if (adjacentDupes > 0) {
    out.push(
      observe(
        "rhythm",
        adjacentDupes === 1
          ? "Adjacent exhibits repeat the same visual — rhythm breaks."
          : "Multiple adjacent exhibits repeat visuals — rhythm feels static.",
        "concern",
      ),
    );
  }

  for (let i = 1; i < scenes.length; i += 1) {
    const prev = scenes[i - 1]!;
    const curr = scenes[i]!;
    if (
      prev.presentationLayout === curr.presentationLayout &&
      prev.museumRoom !== "song_dna" &&
      curr.museumRoom !== "song_dna"
    ) {
      out.push(
        observe(
          "rhythm",
          `${prev.momentLabel} and ${curr.momentLabel} share the same layout — variety may help.`,
          "note",
        ),
      );
      break;
    }
  }

  if (out.length === 0 && scenes.length >= 4) {
    out.push(
      observe(
        "rhythm",
        "Exhibits feel visually distinct as you move through the rooms.",
        "praise",
      ),
    );
  }

  return out;
}

function reviewVisualVariety(
  scenes: PresentableScene[],
  collector: NonNullable<Awaited<ReturnType<typeof loadCollectorPackage>>>,
  director: NonNullable<Awaited<ReturnType<typeof loadDirectorPackage>>>,
): ExperienceCriticObservation[] {
  const out: ExperienceCriticObservation[] = [];
  const urls = scenes
    .map((s) => primaryImageUrl(s))
    .filter((u): u is string => Boolean(u));
  const uniqueUrls = new Set(urls);

  if (urls.length > 0 && uniqueUrls.size / urls.length < 0.7) {
    out.push(
      observe(
        "visualVariety",
        "Frames repeat across exhibits — similar shots reduce surprise.",
        "concern",
      ),
    );
  }

  const iconicPlan = director.experiencePlan.scenes.find(
    (s) => exhibitIdFromScene(s) === "iconic_moment",
  );
  const performancePlan = director.experiencePlan.scenes.find(
    (s) => exhibitIdFromScene(s) === "performance",
  );
  const iconicCat = frameCategoryForAsset(collector, iconicPlan?.linkedImageAssetIds[0]);
  const perfCat = frameCategoryForAsset(collector, performancePlan?.linkedImageAssetIds[0]);

  if (iconicCat && perfCat && iconicCat === perfCat) {
    out.push(
      observe(
        "visualVariety",
        `Iconic Moment should use a different frame category than Performance (${iconicCat}).`,
        "note",
        "iconic_moment",
      ),
    );
  }

  const treatments = scenes
    .filter((s) => s.museumRoom !== "song_dna" && s.museumRoom !== "cover")
    .map((s) => s.imageTreatment);
  if (new Set(treatments).size <= 1 && treatments.length >= 2) {
    out.push(
      observe(
        "visualVariety",
        "Image treatments stay uniform — a shift in texture could add variety.",
        "note",
      ),
    );
  }

  return out;
}

function reviewEmotionalArc(scenes: PresentableScene[]): ExperienceCriticObservation[] {
  const out: ExperienceCriticObservation[] = [];
  const rooms = new Set(scenes.map((s) => s.museumRoom));

  const stages: Array<{ id: ExhibitId; room: MuseumRoom; label: string }> = [
    { id: "cover", room: "cover", label: "Arrival" },
    { id: "chart_journey", room: "chart_journey", label: "Discovery" },
    { id: "iconic_moment", room: "iconic_moment", label: "Emotion" },
    { id: "song_dna", room: "song_dna", label: "Reflection" },
    { id: "performance", room: "performance", label: "Performance" },
  ];

  for (const stage of stages) {
    if (!rooms.has(stage.room)) {
      out.push(
        observe(
          "emotionalArc",
          `${stage.label} stage is missing — ${stage.id.replace("_", " ")} absent from the walkthrough.`,
          "concern",
          stage.id,
        ),
      );
    }
  }

  const dna = sceneByRoom(scenes, "song_dna");
  if (dna?.dnaWatercolorSvg) {
    out.push(
      observe(
        "emotionalArc",
        dna.museumDnaQuoteText
          ? "Song DNA is visually outstanding."
          : "Song DNA artwork carries the reflection beat well.",
        "praise",
        "song_dna",
      ),
    );
  }

  if (rooms.size >= 4 && out.filter((o) => o.tone === "concern").length === 0) {
    out.push(
      observe(
        "emotionalArc",
        "Experience builds from arrival through discovery toward performance.",
        "praise",
      ),
    );
  }

  return out;
}

function reviewClosing(scenes: PresentableScene[]): ExperienceCriticObservation[] {
  const out: ExperienceCriticObservation[] = [];
  const performance = sceneByRoom(scenes, "performance");
  const previous = scenes.filter((s) => s.museumRoom !== "performance").at(-1);

  if (!performance) {
    out.push(
      observe(
        "closing",
        "Performance exhibit missing — ending feels abrupt.",
        "concern",
        "performance",
      ),
    );
    return out;
  }

  if (!performance.assets.imageUrls.length) {
    out.push(
      observe(
        "closing",
        "Performance needs a stronger closing frame.",
        "concern",
        "performance",
      ),
    );
  }

  const perfUrl = primaryImageUrl(performance);
  const prevUrl = primaryImageUrl(previous);
  if (perfUrl && prevUrl && perfUrl === prevUrl) {
    out.push(
      observe(
        "closing",
        "Performance feels weaker than the previous exhibit.",
        "concern",
        "performance",
      ),
    );
  } else if (performance.assets.imageUrls.length) {
    out.push(
      observe(
        "closing",
        "Performance exhibit feels like a satisfying finale.",
        "praise",
        "performance",
      ),
    );
  }

  return out;
}

function dedupeObservations(
  observations: ExperienceCriticObservation[],
): ExperienceCriticObservation[] {
  const seen = new Set<string>();
  return observations.filter((o) => {
    const key = `${o.area}:${o.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Walk the composed museum experience as a patron would — observations only. */
export async function runExperienceCritic(rvtr: string): Promise<ExperienceCriticReport | null> {
  const normalized = rvtr.trim().toUpperCase();
  const [collector, songDna, director, directorHandoff] = await Promise.all([
    loadCollectorPackage(normalized),
    loadSongDnaPackage(normalized),
    loadDirectorPackage(normalized),
    loadDirectorHandoff(normalized),
  ]);

  if (!collector || !director?.experiencePlan) return null;

  const museum = composeMuseumExperience({
    collector,
    songDna,
    chart: null,
    directorPlan: director.experiencePlan,
    directorHandoff,
    appendExtended: false,
  });

  const scenes = museum.scenes;
  if (scenes.length === 0) return null;

  const observations = dedupeObservations([
    ...reviewOpening(scenes, collector, director),
    ...reviewRhythm(scenes),
    ...reviewVisualVariety(scenes, collector, director),
    ...reviewEmotionalArc(scenes),
    ...reviewClosing(scenes),
  ]);

  return {
    computedAt: new Date().toISOString(),
    rvtr: normalized,
    exhibitCount: scenes.length,
    exhibitSequence: scenes.map((s) => s.museumRoom ?? s.momentLabel),
    observations,
  };
}
