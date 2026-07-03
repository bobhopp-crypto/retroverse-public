import { assessCompilationRisk } from "@/lib/healing/compilation-risk";
import type { HealingQueueRow } from "@/lib/healing/load-degraded-queue";
import type {
  RestorationFamilyExample,
  RestorationFamilyFinding,
  RestorationFamilyId,
  RowRestorationFamily,
} from "@/lib/healing/pattern-types";

export const FAMILY_META: Record<
  RestorationFamilyId,
  { name: string; strategy: string; guidance: string }
> = {
  duplicate_ingest_family: {
    name: "Duplicate ingest family",
    strategy:
      "Resolve canonical RVTR root first; approve album link only on probable canonical member.",
    guidance: "Fragmented chart identity — do not heal a variant until family is understood.",
  },
  vdj_only_overlay: {
    name: "VDJ-only media overlay",
    strategy:
      "Find studio album via same-artist + era; VDJ file proves media exists but graph is empty.",
    guidance: "Library has media; canonical album graph missing — typical post-ingest gap.",
  },
  cover_critical_chart_gap: {
    name: "Cover-critical chart gap",
    strategy:
      "Prioritize same-artist studio album with cover; avoid compilation unless no studio option.",
    guidance: "High chart weight + no cover path — public exhibit continuity at risk.",
  },
  compilation_poisoned: {
    name: "Compilation-poisoned entity",
    strategy:
      "Prefer studio-era album; use compilation only if curator confirms era intent.",
    guidance: "Top candidates skew Greatest Hits / anthology — false era if approved blindly.",
  },
  anthology_weak_join: {
    name: "Anthology-driven weak join",
    strategy:
      "Reject weak-confidence compilation slots; search tracklist on original studio LPs.",
    guidance: "Matcher sees title on anthology with weak year alignment.",
  },
  soundtrack_candidate_trap: {
    name: "Soundtrack candidate trap",
    strategy:
      "Verify whether chart hit is soundtrack-led; link OST only when artist intent is film-led.",
    guidance: "Soundtrack album in candidate set — common cover win, graph poison risk.",
  },
  early_era_orphan_single: {
    name: "Early-era orphan single",
    strategy:
      "Expect pre-album-chart singles; link to original 45/EP or first studio LP with slot match.",
    guidance: "1960s-style orphan — album graph often absent for singles-first catalog.",
  },
  high_confidence_studio_match: {
    name: "High-confidence studio match",
    strategy:
      "Verify tracklist slot + year; safe candidate for controlled approve if artist matches.",
    guidance: "Same artist, aligned year, strong match signals — lowest rollback risk class.",
  },
  ambiguous_multi_candidate: {
    name: "Ambiguous multi-candidate",
    strategy:
      "Compare top 2–3 manually; do not approve on confidence alone when scores cluster.",
    guidance: "Several albums score similarly — highest false-positive class after compilations.",
  },
  general_degraded: {
    name: "General degraded track",
    strategy: "Run full candidate audit; classify again after top match review.",
    guidance: "Needs inspection — no dominant family signal in seed metadata.",
  },
};

function topCandidate(row: HealingQueueRow) {
  return row.candidates[0] ?? null;
}

function candidatesWithinBand(row: HealingQueueRow, band = 0.08): boolean {
  const cands = row.candidates;
  if (cands.length < 2) return false;
  const top = cands[0]!.confidence;
  return cands.filter((c) => top - c.confidence <= band).length >= 2;
}

export function classifyRestorationFamily(row: HealingQueueRow): RestorationFamilyId {
  const flags = row.degradationFlags;
  const top = topCandidate(row);
  const year = row.releaseYear;

  if (flags.includes("duplicate_rvtr") || row.duplicateCluster) {
    return "duplicate_ingest_family";
  }
  if (flags.includes("orphan_vdj") && row.albumLinkCount === 0) {
    return "vdj_only_overlay";
  }
  if (row.coverCritical || flags.includes("cover_critical")) {
    return "cover_critical_chart_gap";
  }

  if (top) {
    const compilation = assessCompilationRisk(top.albumTitle, top.artistName);
    if (compilation.level === "high" && (top.trust?.level === "risky" || top.confidence < 0.55)) {
      return "compilation_poisoned";
    }
    if (
      flags.includes("weak_confidence_join") &&
      (compilation.level !== "none" || top.trust?.riskFlags.includes("probable_compilation"))
    ) {
      return "anthology_weak_join";
    }
    if (
      compilation.signals.some((s) => s === "soundtrack" || s === "original_cast") &&
      top.trust?.level !== "trusted"
    ) {
      return "soundtrack_candidate_trap";
    }
    const sameArtist =
      top.artistName.trim().toLowerCase() === row.artistName.trim().toLowerCase();
    if (
      sameArtist &&
      top.confidence >= 0.65 &&
      top.trust?.level === "trusted" &&
      row.albumLinkCount === 0
    ) {
      return "high_confidence_studio_match";
    }
  }

  if (
    year != null &&
    year >= 1960 &&
    year <= 1969 &&
    row.albumLinkCount === 0 &&
    flags.includes("missing_album_links")
  ) {
    return "early_era_orphan_single";
  }

  if (candidatesWithinBand(row)) {
    return "ambiguous_multi_candidate";
  }

  if (top) {
    const compilation = assessCompilationRisk(top.albumTitle, top.artistName);
    if (compilation.level !== "none") {
      return "compilation_poisoned";
    }
  }

  return "general_degraded";
}

export function rowRestorationFamily(row: HealingQueueRow): RowRestorationFamily {
  const id = classifyRestorationFamily(row);
  const meta = FAMILY_META[id];
  return {
    id,
    name: meta.name,
    guidance: meta.guidance,
    strategy: meta.strategy,
  };
}

export function buildFamilyFindings(
  rows: HealingQueueRow[],
  corpusCounts: Partial<Record<RestorationFamilyId, number>>,
): RestorationFamilyFinding[] {
  const byFamily = new Map<RestorationFamilyId, RestorationFamilyExample[]>();

  for (const row of rows) {
    const id = classifyRestorationFamily(row);
    const list = byFamily.get(id) ?? [];
    if (list.length < 3) {
      list.push({ rvtr: row.rvtr, title: row.title, artistName: row.artistName });
    }
    byFamily.set(id, list);
  }

  const order: RestorationFamilyId[] = [
    "cover_critical_chart_gap",
    "high_confidence_studio_match",
    "early_era_orphan_single",
    "vdj_only_overlay",
    "duplicate_ingest_family",
    "compilation_poisoned",
    "soundtrack_candidate_trap",
    "anthology_weak_join",
    "ambiguous_multi_candidate",
    "general_degraded",
  ];

  return order
    .filter((id) => (byFamily.get(id)?.length ?? 0) > 0 || corpusCounts[id] != null)
    .map((id) => {
      const meta = FAMILY_META[id];
      const corpus = corpusCounts[id];
      return {
        id,
        name: meta.name,
        approximateCount: corpus ?? byFamily.get(id)?.length ?? 0,
        countSource: corpus != null ? "corpus" : "queue_sample",
        strategy: meta.strategy,
        examples: byFamily.get(id) ?? [],
      };
    });
}

export function buildRowFamilyMap(
  rows: HealingQueueRow[],
): Record<string, RowRestorationFamily> {
  const out: Record<string, RowRestorationFamily> = {};
  for (const row of rows) {
    out[row.rvtr] = rowRestorationFamily(row);
  }
  return out;
}
