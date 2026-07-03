import "server-only";

import { inspectQuery } from "@/lib/inspect/pg";
import type { HealingDegradedQueue, HealingQueueRow } from "@/lib/healing/load-degraded-queue";
import { loadHealingOutcomeSummary } from "@/lib/healing/load-healing-outcomes";
import {
  buildFamilyFindings,
  buildRowFamilyMap,
  classifyRestorationFamily,
} from "@/lib/healing/restoration-families";
import type {
  ConfidenceReliabilityFinding,
  DangerousPatternFinding,
  EraRestorationObservation,
  HealingRestorationPatterns,
  RestorationFamilyId,
  SafeFixPatternFinding,
} from "@/lib/healing/pattern-types";

export type { HealingRestorationPatterns };

async function loadCorpusFamilyCounts(): Promise<Partial<Record<RestorationFamilyId, number>>> {
  try {
    const [early, vdj, dup] = await Promise.all([
      inspectQuery<{ n: number }>(
        `
        SELECT count(*)::int AS n
        FROM canonical_track_display ctd
        WHERE ctd.has_hot100 = true
          AND ctd.first_chart_date IS NOT NULL
          AND extract(year FROM ctd.first_chart_date::date)::int BETWEEN 1960 AND 1969
          AND NOT EXISTS (
            SELECT 1 FROM canonical_album_tracks cat
            WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
          )
        `,
      ),
      inspectQuery<{ n: number }>(
        `
        SELECT count(*)::int AS n
        FROM canonical_track_display ctd
        WHERE ctd.has_hot100 = true
          AND ctd.has_vdj_media = true
          AND NOT EXISTS (
            SELECT 1 FROM canonical_album_tracks cat
            WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))
          )
        `,
      ),
      inspectQuery<{ n: number }>(
        `
        WITH hot AS (
          SELECT lower(trim(canonical_title)) AS t,
            lower(regexp_replace(trim(canonical_artist_name), '^the\\s+', '', 'i')) AS a
          FROM canonical_track_display
          WHERE has_hot100 = true
            AND trim(coalesce(canonical_title, '')) <> ''
            AND trim(coalesce(canonical_artist_name, '')) <> ''
          GROUP BY 1, 2
          HAVING count(*) > 1
        )
        SELECT count(*)::int AS n FROM hot
        `,
      ),
    ]);
    return {
      early_era_orphan_single: early[0]?.n ?? undefined,
      vdj_only_overlay: vdj[0]?.n ?? undefined,
      duplicate_ingest_family: dup[0]?.n ?? undefined,
    };
  } catch {
    return {};
  }
}

function countInSample(rows: HealingQueueRow[], predicate: (r: HealingQueueRow) => boolean): number {
  return rows.filter(predicate).length;
}

function buildSafeFixPatterns(rows: HealingQueueRow[]): SafeFixPatternFinding[] {
  let studioTrusted = 0;
  let tracklistYear = 0;
  let siblingBridge = 0;

  for (const row of rows) {
    const top = row.candidates[0];
    if (!top?.trust) continue;
    if (top.trust.level === "trusted") studioTrusted += 1;
    if (
      top.trust.strengthFlags.includes("release_year_aligned") &&
      top.trust.strengthFlags.includes("tracklist_title_match")
    ) {
      tracklistYear += 1;
    }
    if (top.reasons.includes("canonical_track_album_link_bridge")) {
      siblingBridge += 1;
    }
  }

  const staticPatterns: SafeFixPatternFinding[] = [
    {
      pattern: "same_artist + release_year_delta_0-2 + tracklist_title_matches",
      reliability: "high",
      confidenceRange: "match 0.55–0.85 · trust ≥ 0.72",
      note: "Studio-era slot match — lowest observed false-positive class.",
      sampleCount: tracklistYear,
    },
    {
      pattern: "canonical_track_album_link_bridge (sibling track on album)",
      reliability: "high",
      confidenceRange: "match ≥ 0.50",
      note: "Album already linked to related RVTR — graph confirms family.",
      sampleCount: siblingBridge,
    },
    {
      pattern: "trusted curator band on audited row",
      reliability: "medium",
      confidenceRange: "trust ≥ 0.72 · match ≥ 0.45",
      note: "Approve only after visual album + era check.",
      sampleCount: studioTrusted,
    },
  ];

  return staticPatterns.filter((p) => p.sampleCount > 0 || p.reliability === "high");
}

function buildDangerousPatterns(
  rows: HealingQueueRow[],
  countsByType: HealingDegradedQueue["countsByType"],
): DangerousPatternFinding[] {
  let compilationTop = 0;
  let ambiguous = 0;
  let duplicate = 0;
  let weakJoin = 0;

  for (const row of rows) {
    const id = classifyRestorationFamily(row);
    if (id === "compilation_poisoned" || id === "anthology_weak_join") compilationTop += 1;
    if (id === "ambiguous_multi_candidate") ambiguous += 1;
    if (id === "duplicate_ingest_family") duplicate += 1;
    if (id === "soundtrack_candidate_trap") weakJoin += 1;
    const top = row.candidates[0];
    if (top && top.trust?.level === "risky") {
      if (top.trust.riskFlags.includes("different_artist_compilation_or_cover")) {
        compilationTop += 1;
      }
    }
  }

  return [
    {
      pattern: "Greatest Hits / Best Of / anthology compilation",
      whyDangerous: "Improves cover while assigning wrong chart era.",
      falsePositiveBehavior: "Title appears on multi-artist album; matcher favors slot availability.",
      sampleCount: compilationTop,
    },
    {
      pattern: "Soundtrack / original cast album",
      whyDangerous: "Film-led metadata on non-soundtrack chart hits.",
      falsePositiveBehavior: "Shared title with OST tracklist; artist name may differ.",
      sampleCount: weakJoin,
    },
    {
      pattern: "Duplicate RVTR ingest family",
      whyDangerous: "Healing wrong variant splits chart + album graph.",
      falsePositiveBehavior: "Confidence reflects fragmented entity, not canonical root.",
      sampleCount: duplicate || countsByType.duplicate_rvtr,
    },
    {
      pattern: "Tied-confidence album candidates",
      whyDangerous: "Top two scores within ~0.08 — picker ambiguity.",
      falsePositiveBehavior: "Curator approves first row; second album was correct studio LP.",
      sampleCount: ambiguous,
    },
    {
      pattern: "Different-artist compilation slot",
      whyDangerous: "VA album holds title under another billing.",
      falsePositiveBehavior: "High match confidence with wrong artist graph edge.",
      sampleCount: countInSample(rows, (r) =>
        r.candidates.some((c) =>
          c.trust?.riskFlags.includes("different_artist_compilation_or_cover"),
        ),
      ),
    },
  ];
}

function buildEraObservations(
  eraRows: { era: string; missingAlbumLinks: number; orphanVdj: number; note: string }[],
): EraRestorationObservation[] {
  const observations: EraRestorationObservation[] = [
    {
      era: "1960s",
      observation: "Singles-first chart era; album graph often absent.",
      restorationCharacter: "Orphan singles — expect EP/45 or first LP slot hunting.",
    },
    {
      era: "1970s",
      observation: "Soundtrack + double-LP compilations peak.",
      restorationCharacter: "Compilation contamination on joins — verify studio LP first.",
    },
    {
      era: "1980s",
      observation: "MTV-era catalog generally better album linkage.",
      restorationCharacter: "Healthier graph — fewer orphan singles; watch reissue years.",
    },
    {
      era: "1990s+",
      observation: "VDJ ingestion overlays increase.",
      restorationCharacter: "VDJ-heavy — media exists while canonical album link missing.",
    },
  ];

  for (const row of eraRows) {
    const decade = Number(row.era.replace("s", ""));
    const existing = observations.find((o) => o.era === row.era);
    if (existing) {
      existing.observation = `${row.missingAlbumLinks.toLocaleString()} Hot 100 missing links · ${row.orphanVdj.toLocaleString()} orphan VDJ. ${row.note}`;
      continue;
    }
    if (decade >= 1960) {
      observations.push({
        era: row.era,
        observation: `${row.missingAlbumLinks.toLocaleString()} missing links · ${row.orphanVdj.toLocaleString()} orphan VDJ.`,
        restorationCharacter: row.note,
      });
    }
  }

  return observations.slice(0, 6);
}

function buildConfidenceReliability(
  outcomes: Awaited<ReturnType<typeof loadHealingOutcomeSummary>>,
  rows: HealingQueueRow[],
): ConfidenceReliabilityFinding {
  const trustedAudited = rows.filter((r) => r.candidates[0]?.trust?.level === "trusted").length;
  const riskyAudited = rows.filter((r) => r.candidates[0]?.trust?.level === "risky").length;
  const cautiousAudited = rows.filter((r) => r.candidates[0]?.trust?.level === "cautious").length;

  const hasOutcomes = outcomes.applySuccesses > 0;
  const rollbackNote = hasOutcomes
    ? `Rollback rate ${outcomes.rollbackRate}% across ${outcomes.applySuccesses} applies — match confidence ${outcomes.confidenceMin?.toFixed(2) ?? "?"}–${outcomes.confidenceMax?.toFixed(2) ?? "?"}.`
    : "No retained applies in audit yet — treat match confidence as hypothesis until outcomes accumulate.";

  return {
    summary: hasOutcomes
      ? "Trust bands calibrated against audit outcomes + queue audits."
      : "Trust bands derived from candidate audits only — outcome sample empty.",
    bands: [
      {
        band: "High reliability",
        matchConfidence: "≥ 0.65",
        curatorTrust: "trusted (≥ 0.72)",
        observation: `Queue sample: ${trustedAudited} audited rows in trusted band. Safe-fix class when same-artist + year aligned.`,
      },
      {
        band: "Review required",
        matchConfidence: "0.45 – 0.64",
        curatorTrust: "cautious",
        observation: `Queue sample: ${cautiousAudited} cautious rows — approve only after family classification.`,
      },
      {
        band: "High false-positive risk",
        matchConfidence: "any with risky trust",
        curatorTrust: "risky (< 0.50 effective)",
        observation: `Queue sample: ${riskyAudited} risky top candidates — compilation, duplicate, or artist mismatch.`,
      },
    ],
    rollbackNote,
    uncertaintyNote:
      outcomes.uncertain > 0
        ? `${outcomes.uncertain} applies awaiting retention confirmation.`
        : "Uncertainty band: tied candidates, duplicate families, compilation tops.",
  };
}

/** Pattern discovery for restoration desk — read-only, no automation. */
export async function loadHealingRestorationPatterns(
  queue: HealingDegradedQueue,
  eraPatterns: { era: string; missingAlbumLinks: number; orphanVdj: number; note: string }[],
): Promise<HealingRestorationPatterns> {
  const [corpusCounts, outcomes] = await Promise.all([
    loadCorpusFamilyCounts(),
    loadHealingOutcomeSummary(),
  ]);

  const auditedRows = queue.rows.filter((r) => r.candidates.length > 0);
  const allRows = queue.rows;

  const families = buildFamilyFindings(allRows, {
    ...corpusCounts,
    cover_critical_chart_gap: queue.countsByType.cover_critical,
    general_degraded: queue.countsByType.missing_album_links,
  });

  const byRvtr = buildRowFamilyMap(allRows);

  return {
    generatedAt: new Date().toISOString(),
    families,
    safeFixPatterns: buildSafeFixPatterns(auditedRows),
    dangerousPatterns: buildDangerousPatterns(auditedRows, queue.countsByType),
    eraObservations: buildEraObservations(eraPatterns),
    confidenceReliability: buildConfidenceReliability(outcomes, auditedRows),
    byRvtr,
  };
}
