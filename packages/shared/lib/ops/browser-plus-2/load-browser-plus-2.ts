import "server-only";

import { loadCoverInfoForRvtrs } from "@/lib/ops/intelligence/load-rvtr-covers";
import { normVdjPath, scanVdjDatabase } from "@/lib/ops/intelligence/vdj-database";
import { loadBrowserPlusModel } from "@/lib/ops/browser-plus/load-browser-plus";
import type { BrowserPlusRow } from "@/lib/ops/browser-plus/types";

import {
  buildReadinessByRvtr,
  buildReadinessPanels,
  loadBp2CohortContext,
} from "./cohorts";
import {
  analyzeFilenameMetadataRecovery,
  hasXmlArtist,
  hasXmlTitle,
  isMissingXmlMetadata,
} from "./filename-metadata-recovery";
import {
  buildMetadataRecoveryReport,
  summarizeMetadataImpact,
} from "./metadata-recovery-report";
import { getResearchBuildQueueStatus } from "./research-build-queue";
import { emptyStudioHint, loadBp2StudioHints } from "./load-studio-package-hints";
import { buildStudioHealth } from "./studio-health";
import { loadStudioOperations } from "./load-studio-operations";
import { getStudioQueueStatus } from "./studio-queue";
import { deriveIdentityStatus, isActiveVideoRow } from "./status";
import { loadBp2PackageHints } from "./load-package-hints";
import {
  computeNextAction,
  computePatronPriority,
  buildPathToReady,
  hasUsableCover,
  type Bp2ReadinessInput,
} from "./readiness";
import type { Bp2Model, Bp2PackageHint, Bp2Row } from "./types";
import { buildPackageIntegrityReport } from "./package-integrity";
import { buildProductionHealth } from "./production-health";
import { buildDailyProductionReport } from "./production-reports";
import { buildWorkQueueSummary, computeWorkQueues } from "./work-queues";

function toBp2Row(
  row: BrowserPlusRow,
  extras: Omit<
    Bp2Row,
    keyof BrowserPlusRow | "hasXmlArtist" | "hasXmlTitle" | "missingXmlMetadata" | "hasFilenameRecovery" | "recoveryConfidence" | "recoveredArtist" | "recoveredTitle"
  >,
): Bp2Row {
  const recovery = analyzeFilenameMetadataRecovery(row.fileName);
  return {
    ...row,
    ...extras,
    hasXmlArtist: hasXmlArtist(row),
    hasXmlTitle: hasXmlTitle(row),
    missingXmlMetadata: isMissingXmlMetadata(row),
    hasFilenameRecovery: recovery.hasRecovery,
    recoveryConfidence: recovery.confidence,
    recoveredArtist: recovery.artist,
    recoveredTitle: recovery.title,
  };
}

async function loadMetadataImpact(rows: Bp2Row[]) {
  try {
    const { analyzeMetadataImpact } = await import("./metadata-impact");
    return await analyzeMetadataImpact(rows);
  } catch {
    return summarizeMetadataImpact(rows);
  }
}

export async function loadBrowserPlus2Model(): Promise<Bp2Model> {
  const [base, hints, vdjScan, studioHints] = await Promise.all([
    loadBrowserPlusModel(),
    loadBp2PackageHints(),
    scanVdjDatabase(),
    loadBp2StudioHints(),
  ]);

  const remixByPath = new Map(
    vdjScan.entries.map((entry) => [entry.filePathNorm, entry.remix] as const),
  );

  const cohortContext = await loadBp2CohortContext(base.rows);

  const activeRvtrs = [
    ...new Set(
      base.rows
        .filter((row) => row.rvtr && isActiveVideoRow(row))
        .map((row) => row.rvtr!.toUpperCase()),
    ),
  ];

  const coverInfo = await loadCoverInfoForRvtrs(activeRvtrs);
  const coverByRvtr = new Map(
    activeRvtrs.map((rvtr) => [rvtr, coverInfo.get(rvtr)?.coverUrl ?? null] as const),
  );

  const rows: Bp2Row[] = base.rows.map((row) => {
    const hint = row.rvtr ? hints.get(row.rvtr) ?? null : null;
    const identityStatus = deriveIdentityStatus(row);
    const storyCount = hint?.storyCount ?? 0;
    const researchStatus = hint?.status ?? null;
    const canonicalCoverUrl = row.rvtr ? coverByRvtr.get(row.rvtr.toUpperCase()) ?? null : null;

    const readinessInput: Bp2ReadinessInput = {
      row,
      hint,
      canonicalCoverUrl,
      storyCount,
    };

    const workQueues = computeWorkQueues(readinessInput);
    const nextAction = computeNextAction({ ...readinessInput, researchStatus });
    const pathToReady = buildPathToReady({ ...readinessInput, researchStatus });
    const rvtrKey = row.rvtr?.toUpperCase() ?? "";
    const studio = row.rvtr ? studioHints.get(rvtrKey) ?? emptyStudioHint(row.rvtr) : emptyStudioHint(null);

    return toBp2Row(row, {
      identityStatus,
      remix: remixByPath.get(normVdjPath(row.filePath)) ?? "",
      storyCount,
      missingStory: Boolean(row.rvtr && row.packageStatus !== "Missing Package" && storyCount === 0),
      experienceReady: workQueues.experienceReady,
      hasUsableCover: hasUsableCover(readinessInput),
      packageArtifactCount: hint?.artifactReadyCount ?? 0,
      researchPackageStatus: researchStatus,
      patronPriority: computePatronPriority(row.rvtr, cohortContext),
      nextAction,
      inSundayCohort: Boolean(rvtrKey && cohortContext.sundayRvtrs.has(rvtrKey)),
      inTop100Cohort: Boolean(rvtrKey && cohortContext.top100Rvtrs.has(rvtrKey)),
      inTop500Cohort: Boolean(rvtrKey && cohortContext.top500Rvtrs.has(rvtrKey)),
      pathToReady,
      workQueues,
      nextAutomation: nextAction,
      studio,
    });
  });

  const readinessByRvtr = buildReadinessByRvtr(rows, coverByRvtr, hints as Map<string, Bp2PackageHint>);
  const readinessPanels = buildReadinessPanels(
    rows,
    cohortContext,
    readinessByRvtr,
    coverByRvtr,
    hints as Map<string, Bp2PackageHint>,
  );
  const metadataRecoveryReport = buildMetadataRecoveryReport(rows);
  const metadataImpact = await loadMetadataImpact(rows);
  const researchQueue = await getResearchBuildQueueStatus(rows, cohortContext);
  const studioQueue = await getStudioQueueStatus();
  const studioHealth = buildStudioHealth(rows);
  const studioOperations = await loadStudioOperations(studioQueue);
  const productionHealth = buildProductionHealth({
    rows,
    jobs: studioQueue.jobs,
    paused: studioQueue.paused,
    operations: studioOperations,
  });
  const dailyReport = buildDailyProductionReport({
    rows,
    jobs: studioQueue.jobs,
    operations: studioOperations,
  });
  const packageIntegrity = await buildPackageIntegrityReport(rows);

  return {
    parsedAt: base.parsedAt,
    databasePath: base.databasePath,
    virtualDjRunning: base.virtualDjRunning,
    rows,
    summary: buildWorkQueueSummary(rows),
    readinessPanels,
    metadataRecoveryReport,
    metadataImpact,
    researchQueue: {
      tiers: researchQueue.tiers,
      activeJob: researchQueue.activeJob
        ? {
            id: researchQueue.activeJob.id,
            status: researchQueue.activeJob.status,
            step: researchQueue.activeJob.step,
            current: researchQueue.activeJob.current,
            total: researchQueue.activeJob.total,
          }
        : null,
    },
    studioHealth,
    productionHealth,
    packageIntegrity,
    dailyReport,
    studioQueue,
    studioOperations,
  };
}
