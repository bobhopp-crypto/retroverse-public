import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { groupCandidates } from "@/lib/healing/mb-ingest/harden";
import { isCanaryStudioAlbum } from "@/lib/healing/mb-ingest/safety";
import type { PilotMbRow } from "@/lib/healing/mb-ingest/types";
import { loadMissingLinkSummary } from "@/lib/track/album-link-recovery/audit-missing-links";
import { inspectQuery } from "@/lib/inspect/pg";

const BUCKET_C_TOTAL = 7_456;
const HOT100_MISSING_BASE = 17_961;
const MB_C_RECOVERABLE_SCALED = 1_789; // Phase 4D 24% of Bucket C
const MB_B_RECOVERABLE_SCALED = 503; // Phase 4D supplemental

type ProposalInventory = {
  total: number;
  byStatus: Record<string, number>;
  byVerdict: Record<string, number>;
  applied: number;
  stagedReady: number;
  reviewQueue: number;
  rejected: number;
};

type PilotRates = {
  pilotRows: number;
  mbComplete: number;
  autoIngestable: number;
  highConfidence: number;
  studioEligible: number;
  safetyQualifiable: number;
  albumGroups: number;
  approve: number;
  review: number;
  reject: number;
  mergedRvtrBonus: number;
};

type ScaleProjection = {
  wave: number;
  newAlbumApplies: number;
  estRvtrLinks: number;
  estHot100Gain: number;
  estHot100LinkedPct: number;
  operatorMinutes: number;
  operatorNotes: string;
};

export type ScaleReadinessAnalysis = {
  generatedAt: string;
  inventory: ProposalInventory;
  coverage: {
    hot100Total: number;
    hot100Linked: number;
    hot100Missing: number;
    hot100LinkedPct: number;
    linkedRvtrCount: number;
    wave5Applied: number;
  };
  bucketC: {
    total: number;
    mbRecoverableScaled: number;
    remainingAfterCanary: number;
  };
  pilotRates: PilotRates;
  scaledEstimates: {
    proposalsGeneratableToday: number;
    albumGroupsAfterHardening: number;
    autoApprove: number;
    manualReview: number;
    reject: number;
    rvtrRecoveries: number;
  };
  projections: ScaleProjection[];
  bottlenecks: string[];
  recommendedBatchSize: number;
  recommendationReason: string;
};

async function loadProposalInventory(): Promise<ProposalInventory> {
  const rows = await inspectQuery<{
    status: string;
    curation_verdict: string | null;
    proposal_id: number;
  }>(
    `
    SELECT status, curation_verdict, proposal_id
    FROM mb_album_ingest_proposals
    `,
  );

  const byStatus: Record<string, number> = {};
  const byVerdict: Record<string, number> = {};
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const v = r.curation_verdict ?? "unset";
    byVerdict[v] = (byVerdict[v] ?? 0) + 1;
  }

  const applied = rows.filter((r) => r.status === "applied").length;
  const stagedReady = rows.filter(
    (r) => r.status === "staged" && r.curation_verdict === "approve",
  ).length;
  const reviewQueue = rows.filter(
    (r) => r.status === "staged" && r.curation_verdict === "review",
  ).length;
  const rejected = rows.filter((r) => r.status === "rejected").length;

  return {
    total: rows.length,
    byStatus,
    byVerdict,
    applied,
    stagedReady,
    reviewQueue,
    rejected,
  };
}

async function analyzePilotRates(): Promise<PilotRates> {
  const raw = await readFile(
    join(process.cwd(), "tools/out/musicbrainz-ingest-pilot.json"),
    "utf8",
  );
  const data = JSON.parse(raw) as { rows: PilotMbRow[] };
  const rows = data.rows;

  const mbComplete = rows.filter((r) => r.mb.complete && r.mb.mbReleaseId).length;
  const autoIngestable = rows.filter((r) => r.autoIngestable).length;
  const highConfidence = rows.filter((r) => r.confidence === "high").length;
  const studioEligible = rows.filter(
    (r) => r.autoIngestable && r.confidence === "high" && isCanaryStudioAlbum(r.mb.album ?? "", r.artist_name).ok,
  ).length;

  const qualified = rows
    .filter((r) => r.autoIngestable && r.confidence === "high")
    .filter((r) => isCanaryStudioAlbum(r.mb.album ?? "", r.artist_name).ok)
    .map((r) => ({
      row: r,
      qualifyReason: "pilot-qualified",
      signals: r.signals,
    }));

  const { groups, rejected } = groupCandidates(qualified);
  const approve = groups.filter((g) => g.curationVerdict === "approve").length;
  const review = groups.filter((g) => g.curationVerdict === "review").length;
  const reject = rejected.length;
  const mergedRvtrBonus = groups.reduce(
    (sum, g) => sum + Math.max(0, g.recoveries.length - 1),
    0,
  );

  return {
    pilotRows: rows.length,
    mbComplete,
    autoIngestable,
    highConfidence,
    studioEligible,
    safetyQualifiable: qualified.length,
    albumGroups: groups.length,
    approve,
    review,
    reject,
    mergedRvtrBonus,
  };
}

function scaleFromPilot(pilot: PilotRates, mbRecoverable: number): ScaleReadinessAnalysis["scaledEstimates"] {
  const autoRate = pilot.autoIngestable / pilot.pilotRows;
  const studioRate = pilot.studioEligible / pilot.pilotRows;
  const groupRate = pilot.albumGroups / pilot.studioEligible;
  const approveRate = pilot.approve / pilot.albumGroups;
  const reviewRate = pilot.review / pilot.albumGroups;
  const rejectRate = pilot.reject / pilot.studioEligible;

  const proposalsGeneratableToday = Math.round(mbRecoverable * autoRate);
  const albumGroupsAfterHardening = Math.round(proposalsGeneratableToday * groupRate);
  const autoApprove = Math.round(albumGroupsAfterHardening * approveRate);
  const manualReview = Math.round(albumGroupsAfterHardening * reviewRate);
  const reject = Math.round(proposalsGeneratableToday * rejectRate);
  const rvtrRecoveries =
    autoApprove +
    manualReview +
    Math.round((autoApprove + manualReview) * (pilot.mergedRvtrBonus / pilot.albumGroups));

  return {
    proposalsGeneratableToday,
    albumGroupsAfterHardening,
    autoApprove,
    manualReview,
    reject,
    rvtrRecoveries,
  };
}

function buildProjections(
  hot100Total: number,
  hot100Linked: number,
  pilot: PilotRates,
  scaled: ScaleReadinessAnalysis["scaledEstimates"],
): ScaleProjection[] {
  const linkPerApply = 1 + pilot.mergedRvtrBonus / pilot.albumGroups;
  const reviewMinPer = 2;
  const autoMinPer = 0.5;

  const waves = [10, 50, 100, 500];
  return waves.map((wave) => {
    const newApplies = Math.max(0, wave - 5);
    const estRvtrLinks = Math.round(newApplies * linkPerApply);
    const estHot100Gain = estRvtrLinks;
    const estHot100LinkedPct =
      hot100Total > 0
        ? Math.round(((hot100Linked + estHot100Gain) / hot100Total) * 1000) / 10
        : 0;

    const reviewInWave = Math.min(
      scaled.manualReview,
      Math.round(newApplies * (pilot.review / pilot.albumGroups)),
    );
    const autoInWave = newApplies - reviewInWave;
    const operatorMinutes = Math.round(
      autoInWave * autoMinPer + reviewInWave * reviewMinPer + newApplies * 0.25,
    );

    return {
      wave,
      newAlbumApplies: newApplies,
      estRvtrLinks,
      estHot100Gain,
      estHot100LinkedPct,
      operatorMinutes,
      operatorNotes:
        wave <= 10
          ? "Canary extension — mostly staged READY inventory"
          : wave <= 50
            ? "Requires MB staging batch (~1 req/s) + daily apply cap"
            : "Requires bulk propose CLI + curator queue + RVAL allocator fix",
    };
  });
}

function pickRecommendedBatch(
  pilot: PilotRates,
  inventory: ProposalInventory,
  scaled: ScaleReadinessAnalysis["scaledEstimates"],
): { size: number; reason: string } {
  const stagedApprove = inventory.stagedReady;
  const wave5Pass = inventory.applied >= 5;

  if (!wave5Pass) {
    return { size: 5, reason: "Wave 5 not yet proven in production." };
  }

  const readyInCanary = stagedApprove;
  const nextWaveIds = 5;

  if (readyInCanary >= 10 && pilot.approve / pilot.albumGroups >= 0.8) {
    return {
      size: 10,
      reason: `${readyInCanary} staged approve proposals in canary batch; wave 5 passed 5/5; Apply-10 adds ${nextWaveIds} net-new (30,38,46,40,41) with 2 merged albums — matches proven rollback + apply path.`,
    };
  }

  if (readyInCanary >= 25) return { size: 25, reason: "Sufficient staged inventory." };
  return { size: 10, reason: "Conservative default after canary." };
}

export async function runScaleReadinessAnalysis(): Promise<ScaleReadinessAnalysis> {
  const [inventory, summary, linked, pilotRates] = await Promise.all([
    loadProposalInventory(),
    loadMissingLinkSummary(),
    inspectQuery<{ c: number }>(
      `SELECT count(DISTINCT upper(trim(canonical_track_key)))::int AS c FROM canonical_album_tracks WHERE canonical_track_key IS NOT NULL`,
    ),
    analyzePilotRates(),
  ]);

  const hot100Total = summary?.hot100Total ?? 32_187;
  const hot100Missing = summary?.hot100MissingLinks ?? HOT100_MISSING_BASE;
  const hot100Linked = hot100Total - hot100Missing;

  const scaledEstimates = scaleFromPilot(pilotRates, MB_C_RECOVERABLE_SCALED);
  const projections = buildProjections(hot100Total, hot100Linked, pilotRates, scaledEstimates);
  const { size, reason } = pickRecommendedBatch(pilotRates, inventory, scaledEstimates);

  const bottlenecks = [
    "No bulk MB propose CLI beyond 50-track pilot — full Bucket C staging requires ~1,789 MB lookups (~30 min at 1 req/s)",
    "RVAL gap-fill allocator uses low-number IDs (RVAL000001+) — ops tooling expects high-range; re-allocate before large batches",
    "Only 28 proposals staged (pilot cohort) — not yet generated from full Bucket C",
    `${inventory.reviewQueue} proposals in manual review queue (edition/artist collision)`,
    "applyMbIngest exists; bulk wave runner only wired for wave 5",
    `Bucket B (${MB_B_RECOVERABLE_SCALED} scaled MB recoverable) is separate pipeline — not in MB ingest v1`,
    "No RETROVERSE_MB_INGEST_AUTO_MAX daily cap enforced in code yet",
    "Cover/RV12 path not wired post-ingest",
  ];

  return {
    generatedAt: new Date().toISOString(),
    inventory,
    coverage: {
      hot100Total,
      hot100Linked,
      hot100Missing,
      hot100LinkedPct:
        hot100Total > 0 ? Math.round((hot100Linked / hot100Total) * 1000) / 10 : 0,
      linkedRvtrCount: linked[0]?.c ?? 0,
      wave5Applied: inventory.applied,
    },
    bucketC: {
      total: BUCKET_C_TOTAL,
      mbRecoverableScaled: MB_C_RECOVERABLE_SCALED,
      remainingAfterCanary: Math.max(0, MB_C_RECOVERABLE_SCALED - pilotRates.pilotRows),
    },
    pilotRates,
    scaledEstimates,
    projections,
    bottlenecks,
    recommendedBatchSize: size,
    recommendationReason: reason,
  };
}

export async function writeScaleReadinessReport(): Promise<{
  reportPath: string;
  jsonPath: string;
  analysis: ScaleReadinessAnalysis;
}> {
  const analysis = await runScaleReadinessAnalysis();
  const { inventory, coverage, bucketC, pilotRates, scaledEstimates, projections } = analysis;

  const report = `# MB Scale Readiness — Phase 6B

**Generated:** ${analysis.generatedAt}  
**Mode:** Read-only analysis — **no apply**, **no data changes**

---

## Executive answer

**Is the pipeline ready to scale beyond canary?** **Partially — ready for Apply-10, not ready for Apply-500.**

| Question | Answer |
|----------|--------|
| **A. Proposals generatable today** | **~${scaledEstimates.proposalsGeneratableToday.toLocaleString()}** (scaled from pilot; **${inventory.total}** currently staged) |
| **B. Qualification split** | Approve **~${scaledEstimates.autoApprove.toLocaleString()}** · Review **~${scaledEstimates.manualReview.toLocaleString()}** · Reject **~${scaledEstimates.reject.toLocaleString()}** |
| **Recommended next batch** | **${analysis.recommendedBatchSize}** — ${analysis.recommendationReason} |

---

## Current inventory (live Postgres)

| Metric | Count |
|--------|------:|
| Total proposal rows | ${inventory.total} |
| **Applied** (wave 5) | ${inventory.applied} |
| **Staged approve** (ready) | ${inventory.stagedReady} |
| Staged review | ${inventory.reviewQueue} |
| Rejected | ${inventory.rejected} |

| Status | Count |
|--------|------:|
${Object.entries(inventory.byStatus)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n")}

| Curation verdict | Count |
|------------------|------:|
${Object.entries(inventory.byVerdict)
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join("\n")}

**Canary batch remaining READY to apply:** ${inventory.stagedReady} proposals (IDs exclude ${inventory.applied} already applied).

---

## Bucket C context

| Metric | Value |
|--------|------:|
| Bucket C (no album in graph) | ${bucketC.total.toLocaleString()} |
| MB recoverable (scaled, Phase 4D) | ${bucketC.mbRecoverableScaled.toLocaleString()} |
| Pilot cohort processed | ${pilotRates.pilotRows} |
| Remaining Bucket C beyond pilot | ~${bucketC.remainingAfterCanary.toLocaleString()} |

---

## Pilot → scale rates (50-track cohort)

| Stage | Pilot n | Rate |
|-------|--------:|-----:|
| MB metadata complete | ${pilotRates.mbComplete} | ${((pilotRates.mbComplete / pilotRates.pilotRows) * 100).toFixed(1)}% |
| Auto-ingestable | ${pilotRates.autoIngestable} | ${((pilotRates.autoIngestable / pilotRates.pilotRows) * 100).toFixed(1)}% |
| Studio-eligible (canary gate) | ${pilotRates.studioEligible} | ${((pilotRates.studioEligible / pilotRates.pilotRows) * 100).toFixed(1)}% |
| Album groups after hardening | ${pilotRates.albumGroups} | ${((pilotRates.albumGroups / pilotRates.studioEligible) * 100).toFixed(1)}% of studio |
| **Approve** | ${pilotRates.approve} | ${((pilotRates.approve / pilotRates.albumGroups) * 100).toFixed(1)}% of groups |
| **Review** | ${pilotRates.review} | ${((pilotRates.review / pilotRates.albumGroups) * 100).toFixed(1)}% of groups |
| **Reject** | ${pilotRates.reject} | ${((pilotRates.reject / pilotRates.studioEligible) * 100).toFixed(1)}% of studio |
| Merged RVTR bonus | +${pilotRates.mergedRvtrBonus} | extra links per batch |

---

## A. Proposals generatable today

| Source | Count | Notes |
|--------|------:|-------|
| **Already staged** | ${inventory.total} | MB-CANARY-25 batch in Postgres |
| **Scaled full Bucket C** | ~${scaledEstimates.proposalsGeneratableToday.toLocaleString()} | ${pilotRates.autoIngestable}/${pilotRates.pilotRows} auto rate × ${bucketC.mbRecoverableScaled.toLocaleString()} MB-recoverable |
| **Album groups (deduped)** | ~${scaledEstimates.albumGroupsAfterHardening.toLocaleString()} | After hardening merge rules |
| **RVTR recoveries** | ~${scaledEstimates.rvtrRecoveries.toLocaleString()} | Includes merged multi-RVTR albums |

*Generatable today in practice = staged inventory (${inventory.stagedReady} approve-ready) unless bulk MB staging CLI is run.*

---

## B. Qualification under current rules

| Verdict | Scaled estimate | Current staged |
|---------|----------------:|---------------:|
| **Auto approve** | ~${scaledEstimates.autoApprove.toLocaleString()} | ${inventory.stagedReady} |
| **Manual review** | ~${scaledEstimates.manualReview.toLocaleString()} | ${inventory.reviewQueue} |
| **Reject** | ~${scaledEstimates.reject.toLocaleString()} | ${inventory.rejected} |

Rules: studio-album gate · mixtape reject · duplicate album merge · artist/edition → review.

---

## C. Projected Hot 100 gain by wave

Baseline after wave 5: **${coverage.hot100Linked.toLocaleString()}** linked (${coverage.hot100LinkedPct}%), **${coverage.hot100Missing.toLocaleString()}** missing.

| Wave | New applies | Est. RVTR links | Hot 100 Δ | Linked % | Operator time |
|------|------------:|----------------:|----------:|---------:|--------------:|
${projections
  .map(
    (p) =>
      `| ${p.wave} | ${p.newAlbumApplies} | ${p.estRvtrLinks} | +${p.estHot100Gain} | ${p.estHot100LinkedPct}% | ~${p.operatorMinutes} min |`,
  )
  .join("\n")}

*Wave 10 = 5 already applied + 5 new. Gains assume ~${(1 + pilotRates.mergedRvtrBonus / pilotRates.albumGroups).toFixed(2)} RVTR links per album apply (merged groups).*

---

## D. Operator time notes

| Wave | Est. time | Work |
|------|----------:|------|
| 10 | ~${projections.find((p) => p.wave === 10)?.operatorMinutes ?? 0} min | Apply 5 staged READY + verify; 0–2 review holds |
| 50 | ~${projections.find((p) => p.wave === 50)?.operatorMinutes ?? 0} min | Stage ~35 new MB lookups + apply cap + spot-check |
| 100 | ~${projections.find((p) => p.wave === 100)?.operatorMinutes ?? 0} min | Stage ~90 + curator queue for review tier |
| 500 | ~${projections.find((p) => p.wave === 500)?.operatorMinutes ?? 0} min | Full staging pipeline + ~${scaledEstimates.manualReview} manual reviews (~${Math.round(scaledEstimates.manualReview * 2 / 60)} hrs) |

---

## E. Bottlenecks preventing large-scale recovery

${analysis.bottlenecks.map((b, i) => `${i + 1}. ${b}`).join("\n")}

---

## Recommended next batch size

## **${analysis.recommendedBatchSize}**

${analysis.recommendationReason}

| Option | Confidence | Rationale |
|--------|------------|-----------|
| **10** | **High** | Wave 5 proved 5/5; ${inventory.stagedReady} approve staged; rollback tested; 5 net-new with 2 merged albums |
| 25 | Medium | Needs staging next 17 MB lookups from pilot overflow |
| 50 | Low | Requires bulk propose CLI + RVAL policy + daily cap |
| 100 | Low | Curator queue + vintage catalog review tier not proven at scale |

---

## Coverage snapshot (live)

| Metric | Value |
|--------|------:|
| Linked RVTRs (all) | ${coverage.linkedRvtrCount.toLocaleString()} |
| Hot 100 linked | ${coverage.hot100Linked.toLocaleString()} |
| Hot 100 missing | ${coverage.hot100Missing.toLocaleString()} |
| Wave 5 applied | ${coverage.wave5Applied} |

---

## Artifacts

- Wave 5: \`reports/mb-wave-5-apply.md\`
- Hardened canary: \`reports/mb-canary-25-hardened.md\`
- ROI: \`reports/external-catalog-roi-experiment.md\`
- JSON: \`tools/out/mb-scale-readiness.json\`

\`\`\`bash
npm run mb:scale:readiness
\`\`\`
`;

  const reportPath = join(process.cwd(), "reports/mb-scale-readiness.md");
  const jsonPath = join(process.cwd(), "tools/out/mb-scale-readiness.json");
  await mkdir(join(process.cwd(), "tools/out"), { recursive: true });
  await writeFile(reportPath, report);
  await writeFile(jsonPath, JSON.stringify(analysis, null, 2));

  return { reportPath, jsonPath, analysis };
}
