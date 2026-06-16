/**
 * Curator acceptance test — D3 evidence model validation.
 * Run: RETROVERSE_OPS=1 RETROVERSE_HEALING_APPLY=1 npx tsx tools/atlas-mission-acceptance-test.ts
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { loadMissionWorkspaceBundle } from "@/lib/atlas/load-mission";
import { confidenceTier } from "@/lib/atlas/mission-confidence";
import { auditTrackAlbumLinks } from "@/lib/track/album-link-recovery/audit-track";
import { loadTrackForRecovery } from "@/lib/track/album-link-recovery/fetch-candidates";
import { inspectQuery } from "@/lib/inspect/pg";

const BASE = process.env.MISSION_TEST_BASE ?? "http://localhost:3000";
const COOKIE = "retroverse_ops_gate=ok";
const RHIANNON = "RVTR097615";

type Snap = {
  exhibitDepthPct: number;
  status: string;
  gaps: string[];
  seals: string[];
  pointsEarned: number;
  pointsAvailable: number;
  territoryMappedPct: number;
  territoryMappedAfterPct: number;
  nextRvtr: string | null;
  prevRvtr: string | null;
  topAlbum: string | null;
  topAlbumConf: number | null;
  topAlbumTier: string | null;
  evidenceCount: number;
};

type StepResult = {
  step: string;
  ok: boolean;
  httpStatus?: number;
  error?: string;
  before: Snap;
  after: Snap;
  delta: Record<string, number | string | null>;
};

type StressCase = {
  category: string;
  rvtr: string;
  auditTitle: string;
  canonicalTitle: string | null;
  topAlbum: string | null;
  topConf: number | null;
  tier: string | null;
  evidenceSignals: number;
  gapCount: number;
  verdict: "pass" | "warn" | "fail";
  notes: string[];
};

function snap(ws: Awaited<ReturnType<typeof loadMissionWorkspaceBundle>>["workspace"]): Snap {
  const top = ws.albumCandidates[0];
  return {
    exhibitDepthPct: ws.exhibitDepthPct,
    status: ws.status,
    gaps: ws.gaps.map((g) => g.kind),
    seals: ws.seals.map((s) => s.id),
    pointsEarned: ws.pointsEarned,
    pointsAvailable: ws.pointsAvailable,
    territoryMappedPct: ws.territoryMappedPct,
    territoryMappedAfterPct: ws.territoryMappedAfterPct,
    nextRvtr: ws.next?.rvtr ?? null,
    prevRvtr: ws.prev?.rvtr ?? null,
    topAlbum: top ? `${top.albumTitle} (${top.releaseYear ?? "?"})` : null,
    topAlbumConf: top?.confidencePct ?? null,
    topAlbumTier: top?.confidenceTier ?? null,
    evidenceCount: top?.evidence.length ?? 0,
  };
}

function delta(b: Snap, a: Snap): Record<string, number | string | null> {
  return {
    exhibitDepth: a.exhibitDepthPct - b.exhibitDepthPct,
    gapsClosed: b.gaps.length - a.gaps.length,
    sealsAdded: a.seals.length - b.seals.length,
    pointsEarned: a.pointsEarned - b.pointsEarned,
    territoryMappedAfter: a.territoryMappedAfterPct - b.territoryMappedAfterPct,
  };
}

async function apiPost(path: string, body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: COOKIE },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, json };
}

async function completeRhiannon(): Promise<StepResult[]> {
  const steps: StepResult[] = [];
  const bundle0 = await loadMissionWorkspaceBundle(RHIANNON);
  if (!bundle0) throw new Error("Rhiannon mission not found");

  let before = snap(bundle0.workspace);
  const ws = bundle0.workspace;

  // Step 1: Album approve
  const album = ws.albumCandidates.find((c) => c.recommended) ?? ws.albumCandidates[0];
  if (album && ws.gaps.some((g) => g.kind === "album")) {
    const { status, json } = await apiPost(`/api/ops/atlas/mission/${RHIANNON}/album-link`, {
      albumId: album.albumId,
      position: album.position,
      sequenceTitle: album.sequenceTitle ?? album.albumTitle,
      confidence: album.confidence,
      reasons: album.reasons,
      sourceKind: album.sourceKind,
    });
    const bundle1 = await loadMissionWorkspaceBundle(RHIANNON);
    const after = snap(bundle1!.workspace);
    steps.push({
      step: "album-link",
      ok: status === 200 && json.ok === true,
      httpStatus: status,
      error: json.ok ? undefined : String(json.message ?? json.error ?? json.code),
      before,
      after,
      delta: delta(before, after),
    });
    before = after;
  }

  // Step 2: Commentary
  if (ws.gaps.some((g) => g.kind === "commentary") || steps.length === 0) {
    const b = await loadMissionWorkspaceBundle(RHIANNON);
    before = snap(b!.workspace);
    const c = b!.workspace.commentary;
    const tags = c.tags.length > 0 ? c.tags : c.suggestedTags;
    const classification = c.classificationLocked ? c.classification : c.suggestedClassification;
    const { status, json } = await apiPost(`/api/ops/atlas/mission/${RHIANNON}/commentary`, {
      tags,
      classification,
    });
    const bundle2 = await loadMissionWorkspaceBundle(RHIANNON);
    const after = snap(bundle2!.workspace);
    steps.push({
      step: "commentary",
      ok: status === 200 && json.ok === true,
      httpStatus: status,
      error: json.ok ? undefined : String(json.error),
      before,
      after,
      delta: delta(before, after),
    });
    before = after;
  }

  // Step 3: TV
  {
    const b = await loadMissionWorkspaceBundle(RHIANNON);
    before = snap(b!.workspace);
    if (b!.workspace.gaps.some((g) => g.kind === "tv")) {
      const pick = b!.workspace.tvCandidates[0];
      const { status, json } = await apiPost(`/api/ops/atlas/mission/${RHIANNON}/appearance`, {
        kind: "tv",
        action: pick ? "confirm" : "reject",
        candidateId: pick?.id ?? "none",
        label: pick?.label ?? "No TV appearance",
        detail: pick?.detail ?? null,
      });
      const bundle3 = await loadMissionWorkspaceBundle(RHIANNON);
      const after = snap(bundle3!.workspace);
      steps.push({
        step: "tv-appearance",
        ok: status === 200 && json.ok === true,
        httpStatus: status,
        error: json.ok ? undefined : String(json.error),
        before,
        after,
        delta: delta(before, after),
      });
      before = after;
    }
  }

  // Step 4: Movie
  {
    const b = await loadMissionWorkspaceBundle(RHIANNON);
    before = snap(b!.workspace);
    if (b!.workspace.gaps.some((g) => g.kind === "movie")) {
      const { status, json } = await apiPost(`/api/ops/atlas/mission/${RHIANNON}/appearance`, {
        kind: "movie",
        action: "reject",
        candidateId: "none",
        label: "No movie appearance",
        detail: null,
      });
      const bundle4 = await loadMissionWorkspaceBundle(RHIANNON);
      const after = snap(bundle4!.workspace);
      steps.push({
        step: "movie-appearance",
        ok: status === 200 && json.ok === true,
        httpStatus: status,
        error: json.ok ? undefined : String(json.error),
        before,
        after,
        delta: delta(before, after),
      });
    }
  }

  return steps;
}

async function verifyRelatedCards(): Promise<
  Array<{ rvtr: string; title: string; ok: boolean; hasMissionPage: boolean; gapKinds: string[] }>
> {
  const bundle = await loadMissionWorkspaceBundle(RHIANNON);
  if (!bundle) return [];
  const out = [];
  for (const card of bundle.workspace.relatedByArtist.slice(0, 4)) {
    const res = await fetch(`${BASE}/ops/atlas/mission/${card.rvtr}`, {
      headers: { Cookie: COOKIE },
    });
    const b = await loadMissionWorkspaceBundle(card.rvtr);
    out.push({
      rvtr: card.rvtr,
      title: card.title,
      ok: res.status === 200 && Boolean(b),
      hasMissionPage: res.status === 200,
      gapKinds: b?.workspace.gaps.map((g) => g.kind) ?? [],
    });
  }
  return out;
}

async function findStressCases(
  auditRvtrs: Set<string>,
  auditRows: Array<{
    rvtr: string | null;
    title: string;
    path: string | null;
    peakHot100?: number | null;
    playCount?: number | null;
    albumScore?: number;
    tagSource?: string | null;
    canonicalTags?: string[];
  }>,
): Promise<StressCase[]> {
  const cases: Array<{ category: string; rvtr: string; auditTitle: string; note: string }> = [];

  // Alternate titles — canonical != short audit title
  const altRows = await inspectQuery<{
    track_id: string;
    canonical_title: string;
    canonical_artist_name: string;
  }>(
    `
    SELECT track_id, canonical_title, canonical_artist_name
    FROM canonical_track_display
    WHERE length(trim(canonical_title)) > 20
      AND canonical_title ~* '(will you|live|version|remix|part 1|part 2)'
    ORDER BY random()
    LIMIT 3
    `,
  );
  for (const r of altRows) {
    if (!auditRvtrs.has(r.track_id.toUpperCase())) continue;
    cases.push({
      category: "alternate_title",
      rvtr: r.track_id,
      auditTitle: r.canonical_title,
      note: "Long/alternate canonical title",
    });
  }

  // Live versions from audit paths
  for (const row of auditRows) {
    if (!row.rvtr) continue;
    const p = row.path?.toLowerCase() ?? "";
    const t = row.title?.toLowerCase() ?? "";
    if ((p.includes("live") || t.includes("live")) && cases.every((c) => c.rvtr !== row.rvtr)) {
      cases.push({
        category: "live_version",
        rvtr: row.rvtr,
        auditTitle: row.title,
        note: row.path ?? "",
      });
      if (cases.filter((c) => c.category === "live_version").length >= 2) break;
    }
  }

  // Featuring / duet — path or title hints
  for (const row of auditRows) {
    if (!row.rvtr) continue;
    const blob = `${row.title} ${row.path}`.toLowerCase();
    if (
      (blob.includes(" feat") ||
        blob.includes(" ft.") ||
        blob.includes(" featuring") ||
        blob.includes(" with ") ||
        blob.includes(" & ") ||
        blob.includes(" duet")) &&
      cases.every((c) => c.rvtr !== row.rvtr)
    ) {
      cases.push({
        category: "featuring_artist",
        rvtr: row.rvtr,
        auditTitle: row.title,
        note: row.path ?? "",
      });
      if (cases.filter((c) => c.category === "featuring_artist").length >= 2) break;
    }
  }

  // One-hit wonders — peak <= 10, low play count in audit
  for (const row of auditRows) {
    if (!row.rvtr || (row.albumScore ?? 0) >= 0.75) continue;
    if (row.peakHot100 != null && row.peakHot100 <= 15 && (row.playCount ?? 0) <= 5) {
      if (cases.every((c) => c.rvtr !== row.rvtr)) {
        cases.push({
          category: "one_hit_wonder",
          rvtr: row.rvtr,
          auditTitle: row.title,
          note: `Hot100 #${row.peakHot100}, ${row.playCount ?? 0} plays`,
        });
      }
    }
    if (cases.filter((c) => c.category === "one_hit_wonder").length >= 2) break;
  }

  // Poor VDJ metadata — no tags, no classification signal
  for (const row of auditRows) {
    if (!row.rvtr) continue;
    if (
      row.tagSource === "none" &&
      (row.canonicalTags?.length ?? 0) === 0 &&
      (row.playCount ?? 0) === 0
    ) {
      if (cases.every((c) => c.rvtr !== row.rvtr)) {
        cases.push({
          category: "poor_vdj_metadata",
          rvtr: row.rvtr,
          auditTitle: row.title,
          note: "No tags, 0 plays",
        });
      }
    }
    if (cases.filter((c) => c.category === "poor_vdj_metadata").length >= 2) break;
  }

  // Always include Rhiannon as alternate-title control
  if (!cases.some((c) => c.rvtr === RHIANNON)) {
    cases.unshift({
      category: "alternate_title",
      rvtr: RHIANNON,
      auditTitle: "Rhiannon",
      note: "Canonical: Rhiannon Will You Ever Win",
    });
  }

  const results: StressCase[] = [];
  for (const c of cases.slice(0, 12)) {
    const notes: string[] = [c.note];
    const track = await loadTrackForRecovery(c.rvtr);
    const audit = await auditTrackAlbumLinks(c.rvtr);
    const bundle = await loadMissionWorkspaceBundle(c.rvtr);
    const top = audit?.candidates[0];
    const tier = top ? confidenceTier(Math.round(top.confidence * 100)) : null;
    const evidenceCount = bundle?.workspace.albumCandidates[0]?.evidence.length ?? 0;
    const gapCount = bundle?.workspace.gaps.length ?? 0;

    let verdict: StressCase["verdict"] = "pass";
    if (!auditRvtrs.has(c.rvtr.toUpperCase())) {
      verdict = "warn";
      notes.push("Outside 1970s audit — skipped for territory mission scope");
    } else if (!bundle) {
      verdict = "fail";
      notes.push("Mission workspace not found");
    } else if (!top) {
      verdict = "warn";
      notes.push("No album candidates — research needed state expected");
    } else if (tier === "high" && top.reasons.includes("artist_discography_only_no_tracklist")) {
      verdict = "fail";
      notes.push("High confidence on discography-only guess — evidence model failure");
    } else if (tier === "high" && top.confidence >= 0.85 && evidenceCount < 2) {
      verdict = "warn";
      notes.push("High tier with thin evidence panel");
    } else if (tier === "low") {
      verdict = "pass";
      notes.push("Correctly downgraded to research-needed tier");
    } else if (tier === "medium") {
      verdict = "pass";
      notes.push("Review tier — evidence shown, no blind approve");
    }

    if (track && c.auditTitle && !track.canonical_title.toLowerCase().includes(c.auditTitle.toLowerCase().slice(0, 6))) {
      notes.push(`Canonical title drift: "${track.canonical_title}"`);
    }

    results.push({
      category: c.category,
      rvtr: c.rvtr,
      auditTitle: c.auditTitle,
      canonicalTitle: track?.canonical_title ?? null,
      topAlbum: top ? `${top.albumTitle} (${top.releaseYear ?? "?"})` : null,
      topConf: top ? Math.round(top.confidence * 100) : null,
      tier,
      evidenceSignals: evidenceCount,
      gapCount,
      verdict,
      notes,
    });
  }

  return results;
}

async function main() {
  if (process.env.RETROVERSE_OPS !== "1") {
    console.warn("WARN: RETROVERSE_OPS=1 not set — API calls may 403");
  }
  if (process.env.RETROVERSE_HEALING_APPLY !== "1") {
    console.warn("WARN: RETROVERSE_HEALING_APPLY=1 not set — album writes may 403");
  }

  const initial = await loadMissionWorkspaceBundle(RHIANNON);
  if (!initial) throw new Error("Rhiannon not found");

  const auditRaw = JSON.parse(
    await import("node:fs/promises").then((fs) =>
      fs.readFile(join(process.cwd(), "reports/1970s-performance-universe-audit.json"), "utf8"),
    ),
  ) as {
    rows: Array<{
      rvtr: string | null;
      title: string;
      path: string | null;
      peakHot100?: number | null;
      playCount?: number | null;
      albumScore?: number;
      tagSource?: string | null;
      canonicalTags?: string[];
    }>;
  };
  const auditRvtrs = new Set(
    auditRaw.rows.map((r) => r.rvtr?.trim().toUpperCase()).filter(Boolean) as string[],
  );

  const rhiannonSteps = await completeRhiannon();
  const final = await loadMissionWorkspaceBundle(RHIANNON);
  const related = await verifyRelatedCards();
  const stress = await findStressCases(auditRvtrs, auditRaw.rows);

  // Album write probe (documents slot_occupied vs success)
  let albumWriteProbe: Record<string, unknown> | null = null;
  const probeBundle = await loadMissionWorkspaceBundle(RHIANNON);
  const topAlbum = probeBundle?.workspace.albumCandidates[0];
  if (topAlbum && probeBundle?.workspace.gaps.some((g) => g.kind === "album")) {
    const { status, json } = await apiPost(`/api/ops/atlas/mission/${RHIANNON}/album-link`, {
      albumId: topAlbum.albumId,
      position: topAlbum.position,
      sequenceTitle: topAlbum.sequenceTitle ?? topAlbum.albumTitle,
      confidence: topAlbum.confidence,
      reasons: topAlbum.reasons,
      sourceKind: topAlbum.sourceKind,
    });
    albumWriteProbe = {
      album: `${topAlbum.albumTitle} (${topAlbum.releaseYear})`,
      confidencePct: topAlbum.confidencePct,
      linkedRvtr: topAlbum.linkedRvtr,
      httpStatus: status,
      ok: status === 200 && json.ok === true,
      code: json.code ?? null,
      message: json.message ?? json.error ?? null,
    };
  }

  const report = {
    generatedAt: new Date().toISOString(),
    rhiannon: {
      initial: snap(initial.workspace),
      final: final ? snap(final.workspace) : null,
      steps: rhiannonSteps,
      albumWriteProbe,
      queueNext: final?.workspace.next ?? null,
      allWritesOk: rhiannonSteps.every((s) => s.ok),
      gapsRemaining: final?.workspace.gaps.map((g) => g.kind) ?? [],
      missionComplete: (final?.workspace.gaps.length ?? 99) === 0,
    },
    relatedFleetwoodMac: related,
    stressCases: stress,
    stressSummary: {
      pass: stress.filter((s) => s.verdict === "pass").length,
      warn: stress.filter((s) => s.verdict === "warn").length,
      fail: stress.filter((s) => s.verdict === "fail").length,
    },
  };

  const outJson = join(process.cwd(), "reports/atlas-phase-d/d3-acceptance-test.json");
  await writeFile(outJson, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outJson}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
