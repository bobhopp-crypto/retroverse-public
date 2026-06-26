"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  BP2_FILTERS,
  filterCounts,
  matchesBp2Filter,
  sortForFilter,
} from "@/lib/ops/browser-plus-2/status";
import {
  BP2_STUDIO_FILTERS,
  matchesAllStudioFilters,
  rowsForOvernightPreset,
  studioFilterCounts,
  type Bp2OvernightPresetId,
} from "@/lib/ops/browser-plus-2/studio-filters";
import type {
  Bp2FilterId,
  Bp2Model,
  Bp2ReadinessBlockers,
  Bp2ResearchQueueTier,
  Bp2Row,
  Bp2StudioFilterId,
  Bp2StudioQueueDepartment,
} from "@/lib/ops/browser-plus-2/types";
import {
  collectorUrl,
  coverToolsUrl,
  directorUrl,
  editorUrl,
  experiencePlanUrl,
  matchingWorkflowUrl,
  nextActionIsDisabled,
  nextActionLabel,
  pickReviewNextRow,
  researchPackageUrl,
  songExperienceUrl,
  tierButtonLabel,
} from "@/lib/ops/browser-plus-2/mission-actions";
import { OVERNIGHT_PRESETS } from "@/lib/ops/browser-plus-2/studio-filters";
import { estimateOvernightRuntime } from "@/lib/ops/browser-plus-2/overnight-estimate";
import { StudioBatchBar } from "@/components/ops/browser-plus-2/StudioBatchBar";
import { StudioDailyReportPanel } from "@/components/ops/browser-plus-2/StudioDailyReportPanel";
import { StudioHealthDashboard } from "@/components/ops/browser-plus-2/StudioHealthDashboard";
import { StudioOperationsDashboard } from "@/components/ops/browser-plus-2/StudioOperationsDashboard";
import { StudioQueuePanel } from "@/components/ops/browser-plus-2/StudioQueuePanel";
import {
  activeWorkQueueLabels,
  computeWorkQueueResearchScore,
  workQueueBadgeClass,
  workQueueResearchScoreLevel,
} from "@/lib/ops/browser-plus-2/work-queues";
import {
  computeExperienceScore,
  researchStatusLabel,
} from "@/lib/ops/song-intelligence-labels";
import { MetadataDisplayCell, MetadataDisplayLine } from "@/components/ops/browser-plus-2/MetadataDisplayCell";
import { MetadataRecoveryPanel } from "@/components/ops/browser-plus-2/MetadataRecoveryPanel";
import { MetadataRecoveryReport } from "@/components/ops/browser-plus-2/MetadataRecoveryReport";
import type { ChartJourneySummary } from "@/lib/chart-journey/types";
import type { SongPackage } from "@/lib/ops/intelligence/song-package-types";
import { buildPackageViewModel, defaultRelationships } from "@/lib/ops/intelligence/package-view-model";

const QUESTION_HEADING_RE = /^why (was|did|is|does|do)\b/i;

function isQuestionHeading(headline: string): boolean {
  const trimmed = headline.trim();
  return QUESTION_HEADING_RE.test(trimmed) || trimmed.endsWith("?");
}

function studioStageClass(stage: Bp2Row["studio"]["stage"]): string {
  switch (stage) {
    case "complete":
      return "bp2__studio-stage bp2__studio-stage--complete";
    case "director":
      return "bp2__studio-stage bp2__studio-stage--director";
    case "editor":
      return "bp2__studio-stage bp2__studio-stage--editor";
    case "collector":
      return "bp2__studio-stage bp2__studio-stage--collector";
    default:
      return "bp2__studio-stage";
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatBlockers(blockers: Bp2ReadinessBlockers): Array<{ label: string; count: number }> {
  const items = [
    { label: "Missing Research", count: blockers.missingResearch },
    { label: "Needs Review", count: blockers.needsReview },
    { label: "Missing Cover", count: blockers.missingCover },
    { label: "Renderability", count: blockers.renderability },
  ];
  return items.filter((item) => item.count > 0);
}

function ReadinessBlockersList({ blockers }: { blockers: Bp2ReadinessBlockers }) {
  const items = formatBlockers(blockers);
  if (items.length === 0) return null;
  return (
    <ul className="bp2__blocker-list">
      {items.map((item) => (
        <li key={item.label}>
          {item.label}: <strong>{item.count.toLocaleString()}</strong>
        </li>
      ))}
    </ul>
  );
}
const OPERATIONS_QUEUES: Array<{
  filter: Bp2FilterId;
  label: string;
  hint: string;
  summaryKey: keyof Bp2Model["summary"];
}> = [
  { filter: "needs-identity", label: "Needs Identity", hint: "No RVTR assigned", summaryKey: "needsIdentity" },
  { filter: "needs-research", label: "Needs Research", hint: "No research package", summaryKey: "needsResearch" },
  { filter: "needs-review", label: "Needs Review", hint: "Awaiting approval", summaryKey: "needsReview" },
  { filter: "no-usable-cover", label: "No Usable Cover", hint: "No artwork from any source", summaryKey: "noUsableCover" },
  { filter: "experience-ready", label: "Experience Ready", hint: "Patron-ready songs", summaryKey: "experienceReady" },
];

function nextActionClass(action: Bp2Row["nextAction"]): string {
  switch (action) {
    case "Experience Ready":
      return "bp2__next-action bp2__next-action--ready";
    case "Review Package":
      return "bp2__next-action bp2__next-action--review";
    case "Build Research":
      return "bp2__next-action bp2__next-action--research";
    case "Acquire Cover":
      return "bp2__next-action bp2__next-action--cover";
    default:
      return "bp2__next-action";
  }
}

function priorityClass(priority: Bp2Row["patronPriority"]): string {
  switch (priority) {
    case "Sunday Nights":
      return "bp2__priority bp2__priority--sunday";
    case "Top 100":
      return "bp2__priority bp2__priority--top100";
    case "Top 500":
      return "bp2__priority bp2__priority--top500";
    default:
      return "bp2__priority";
  }
}

function WorkQueueChips({ row }: { row: Bp2Row }) {
  const labels = activeWorkQueueLabels(row.workQueues);
  if (labels.length === 0) {
    return <span className="bp2-badge bp2-badge--pending">No queue</span>;
  }
  return (
    <span className="bp2__queue-chips">
      {labels.map((label) => (
        <span key={label} className={workQueueBadgeClass(label)}>
          {label}
        </span>
      ))}
    </span>
  );
}

type StoryBlurb = {
  id: string;
  text: string;
};

function storyBlurbsFromPackage(pkg: SongPackage): StoryBlurb[] {
  const view = buildPackageViewModel(pkg, defaultRelationships(pkg));
  const blurbs: StoryBlurb[] = [];

  for (const card of pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden)) {
    if (card.fact.trim()) {
      blurbs.push({ id: card.id, text: card.fact.trim() });
    }
  }

  if (blurbs.length === 0) {
    for (const story of view.stories) {
      if (isQuestionHeading(story.headline)) {
        for (const fact of story.supportingFacts) {
          if (fact.trim()) blurbs.push({ id: `${story.id}-${fact.slice(0, 12)}`, text: fact.trim() });
        }
        continue;
      }
      const body = story.supportingFacts[0]?.trim() || story.headline.trim();
      if (body) blurbs.push({ id: story.id, text: body });
    }
  }

  const seen = new Set<string>();
  return blurbs.filter((b) => {
    const key = b.text.slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function artifactChecks(pkg: SongPackage | null, row: Bp2Row) {
  if (!pkg) {
    return [
      { label: "Cover", ready: row.hasCover, detail: row.hasCover ? "Present" : "Missing" },
      { label: "Chart history", ready: false, detail: "—" },
      { label: "Story", ready: row.storyCount > 0, detail: String(row.storyCount) },
      { label: "Artist facts", ready: false, detail: "—" },
      { label: "Timeline", ready: false, detail: "—" },
      { label: "Related songs", ready: false, detail: "—" },
      { label: "Album context", ready: false, detail: "—" },
      { label: "Video / media", ready: row.isVideo && row.fileExists, detail: row.fileExists ? "File present" : "Missing" },
    ];
  }

  const intel = pkg.intel;
  const storyCount =
    pkg.candidateStories.filter((s) => s.reviewStatus !== "rejected").length ||
    pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden).length;
  const artistFacts = pkg.candidateFacts.filter(
    (f) => f.category === "artist" && f.reviewStatus !== "rejected" && !f.mergedIntoId,
  ).length;
  const view = buildPackageViewModel(pkg, defaultRelationships(pkg));

  return [
    {
      label: "Cover",
      ready: Boolean(pkg.metadata.coverUrl || row.hasCover),
      detail: pkg.metadata.coverUrl ? "Research" : row.hasCover ? "VDJ" : "Missing",
    },
    { label: "Chart history", ready: (intel?.chartHistory.length ?? 0) > 0, detail: String(intel?.chartHistory.length ?? 0) },
    { label: "Story", ready: storyCount > 0, detail: String(storyCount) },
    { label: "Artist facts", ready: artistFacts > 0, detail: String(artistFacts) },
    { label: "Timeline", ready: (intel?.timelineEvents.length ?? 0) >= 2, detail: String(intel?.timelineEvents.length ?? 0) },
    { label: "Related songs", ready: view.relationships.relatedSongs.length > 0, detail: String(view.relationships.relatedSongs.length) },
    { label: "Album context", ready: Boolean(pkg.metadata.albumTitle), detail: pkg.metadata.albumTitle ?? "—" },
    {
      label: "Video / media",
      ready: Boolean(pkg.metadata.hasVdjMedia || pkg.metadata.videoInfo || row.fileExists),
      detail: pkg.metadata.hasVdjMedia ? "VDJ media" : row.fileExists ? "Local file" : "—",
    },
  ];
}

export function BrowserPlus2Client() {
  const [model, setModel] = useState<Bp2Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Bp2FilterId>("all-videos");
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pkg, setPkg] = useState<SongPackage | null>(null);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [storyLine, setStoryLine] = useState("");
  const [storySaving, setStorySaving] = useState(false);
  const [storyMessage, setStoryMessage] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [queueBusy, setQueueBusy] = useState(false);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const [chartSummary, setChartSummary] = useState<ChartJourneySummary | null>(null);
  const [chartSummaryLoading, setChartSummaryLoading] = useState(false);
  const [studioFilters, setStudioFilters] = useState<Bp2StudioFilterId[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [studioQueueBusy, setStudioQueueBusy] = useState(false);
  const [studioQueueMessage, setStudioQueueMessage] = useState<string | null>(null);

  const loadModel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/browser-plus-2", { cache: "no-store" });
      const raw = await res.text();
      let data: { ok: boolean; model?: Bp2Model; error?: string };
      try {
        data = JSON.parse(raw) as { ok: boolean; model?: Bp2Model; error?: string };
      } catch {
        throw new Error(res.ok ? "invalid_api_response" : `api_error_${res.status}`);
      }
      if (!res.ok || !data.ok || !data.model) {
        throw new Error(data.error ?? `api_error_${res.status}`);
      }
      setModel(data.model);
    } catch (err) {
      setError(err instanceof Error ? err.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadModel();
  }, [loadModel]);

  const filteredRows = useMemo(() => {
    if (!model) return [];
    const matched = model.rows.filter(
      (row) => matchesBp2Filter(row, filter) && matchesAllStudioFilters(row, studioFilters),
    );
    return sortForFilter(matched, filter);
  }, [model, filter, studioFilters]);

  const counts = useMemo(() => (model ? filterCounts(model.rows) : null), [model]);
  const studioCounts = useMemo(
    () => (model ? studioFilterCounts(model.rows) : null),
    [model],
  );

  const selectedRow = useMemo(
    () => filteredRows.find((row) => row.id === selectedId) ?? filteredRows[0] ?? null,
    [filteredRows, selectedId],
  );

  useEffect(() => {
    if (!selectedRow?.rvtr) {
      setPkg(null);
      return;
    }

    let cancelled = false;
    setPkgLoading(true);
    void fetch(`/api/ops/intelligence/${selectedRow.rvtr}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as { ok: boolean; package?: SongPackage };
        if (cancelled) return;
        setPkg(res.ok && data.ok && data.package ? data.package : null);
      })
      .catch(() => {
        if (!cancelled) setPkg(null);
      })
      .finally(() => {
        if (!cancelled) setPkgLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRow?.rvtr]);

  useEffect(() => {
    if (!selectedRow?.rvtr) {
      setChartSummary(null);
      return;
    }

    let cancelled = false;
    setChartSummaryLoading(true);
    void fetch(`/api/chart-journey?rvtr=${encodeURIComponent(selectedRow.rvtr)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const data = (await res.json()) as { ok: boolean; summary?: ChartJourneySummary };
        if (cancelled) return;
        setChartSummary(res.ok && data.ok && data.summary ? data.summary : null);
      })
      .catch(() => {
        if (!cancelled) setChartSummary(null);
      })
      .finally(() => {
        if (!cancelled) setChartSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedRow?.rvtr]);

  const blurbs = useMemo(() => (pkg ? storyBlurbsFromPackage(pkg) : []), [pkg]);
  const artifacts = useMemo(
    () => (selectedRow ? artifactChecks(pkg, selectedRow) : []),
    [pkg, selectedRow],
  );

  const researchSummary = useMemo(() => {
    if (!selectedRow) return null;

    const factCount = pkg
      ? pkg.candidateFacts.filter((f) => f.reviewStatus !== "rejected" && !f.mergedIntoId).length
      : 0;
    const storyCount = pkg
      ? pkg.candidateStories.filter((s) => s.reviewStatus !== "rejected").length ||
        pkg.storyCards.filter((c) => c.rank > 0 && !c.hidden).length
      : selectedRow.storyCount;
    const sourceCount = pkg?.researchVault.length ?? 0;
    const artifactReadyCount = artifacts.filter((a) => a.ready).length;
    const view = pkg ? buildPackageViewModel(pkg, defaultRelationships(pkg)) : null;

    const researchScore = computeWorkQueueResearchScore({
      rvtr: selectedRow.rvtr,
      hasUsableCover: selectedRow.hasUsableCover,
      factCount,
      storyCount,
      timelineEvents: pkg?.intel?.timelineEvents.length ?? 0,
      relatedSongs: view?.relationships.relatedSongs.length ?? 0,
      artistFacts: pkg
        ? pkg.candidateFacts.filter(
            (f) => f.category === "artist" && f.reviewStatus !== "rejected" && !f.mergedIntoId,
          ).length
        : 0,
    });

    const experienceScore = computeExperienceScore(
      selectedRow.rvtr,
      selectedRow.hasCover,
      selectedRow.experienceReady,
      pkg,
      storyCount,
      factCount,
    );

    return {
      factCount,
      storyCount,
      sourceCount,
      artifactReadyCount,
      researchScore,
      experienceScore,
      researchLevel: workQueueResearchScoreLevel(researchScore),
    };
  }, [artifacts, pkg, selectedRow]);

  async function saveStoryLine() {
    if (!selectedRow?.rvtr || !storyLine.trim()) return;
    setStorySaving(true);
    setStoryMessage(null);
    try {
      const res = await fetch("/api/ops/browser-plus-2/story-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rvtr: selectedRow.rvtr, text: storyLine.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; package?: SongPackage; error?: string };
      if (!res.ok || !data.ok || !data.package) {
        throw new Error(data.error ?? "save_failed");
      }
      setPkg(data.package);
      setStoryLine("");
      setStoryMessage("Story line saved.");
      void loadModel();
    } catch (err) {
      setStoryMessage(err instanceof Error ? err.message : "save_failed");
    } finally {
      setStorySaving(false);
    }
  }

  async function startStudioQueue(
    department: Bp2StudioQueueDepartment,
    rvtrs: string[],
  ) {
    if (rvtrs.length === 0) {
      setStudioQueueMessage("No RVTRs to queue.");
      return;
    }
    setStudioQueueBusy(true);
    setStudioQueueMessage(null);
    try {
      const res = await fetch("/api/ops/browser-plus-2/studio-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department, rvtrs }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; job?: { id: string } };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "studio_queue_failed");
      setStudioQueueMessage(`Queued ${rvtrs.length} song(s) — ${department} (${data.job?.id?.slice(0, 8) ?? "job"}).`);
      void loadModel();
    } catch (err) {
      setStudioQueueMessage(err instanceof Error ? err.message : "studio_queue_failed");
    } finally {
      setStudioQueueBusy(false);
    }
  }

  function rvtrsFromScope(scope: "selection" | "filtered"): string[] {
    const rows =
      scope === "selection"
        ? filteredRows.filter((r) => selectedIds.has(r.id))
        : filteredRows;
    return [...new Set(rows.map((r) => r.rvtr).filter(Boolean) as string[])];
  }

  function handleBatchAction(department: Bp2StudioQueueDepartment, scope: "selection" | "filtered") {
    void startStudioQueue(department, rvtrsFromScope(scope));
  }

  function handleOvernight(preset: Bp2OvernightPresetId) {
    if (!model) return;
    const presetDef = OVERNIGHT_PRESETS.find((p) => p.id === preset);
    const rows = rowsForOvernightPreset(model.rows, preset);
    const rvtrs = rows.map((r) => r.rvtr).filter(Boolean) as string[];
    const cap = preset === "entire-library" || preset === "top-500-cohort" ? rvtrs.length : Math.min(rvtrs.length, 100);
    void startStudioQueue(presetDef?.department ?? "run-collector", rvtrs.slice(0, cap));
  }

  const top100OvernightEstimate = useMemo(() => {
    if (!model) return null;
    return estimateOvernightRuntime("top-100-played", model.rows);
  }, [model]);

  async function studioQueueControl(action: "pause" | "resume" | "cancel" | "retry", jobId?: string) {
    setStudioQueueBusy(true);
    try {
      const res = await fetch("/api/ops/browser-plus-2/studio-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, jobId, paused: action === "pause" }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (!res.ok || !data.ok) throw new Error("queue_control_failed");
      void loadModel();
    } catch (err) {
      setStudioQueueMessage(err instanceof Error ? err.message : "queue_control_failed");
    } finally {
      setStudioQueueBusy(false);
    }
  }

  function toggleStudioFilter(id: Bp2StudioFilterId) {
    setStudioFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  function toggleRowSelection(id: string, shiftKey: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    if (!shiftKey) setSelectedId(id);
  }

  function toggleSelectAllFiltered() {
    const allSelected = filteredRows.every((r) => selectedIds.has(r.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map((r) => r.id)));
    }
  }

  async function startResearchQueue(options?: {
    tier?: Bp2ResearchQueueTier;
    rvtr?: string;
    limit?: number;
  }) {
    setQueueBusy(true);
    setQueueMessage(null);
    try {
      const res = await fetch("/api/ops/browser-plus-2/research-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: options?.limit ?? (options?.tier ? 1 : 5),
          tier: options?.tier,
          rvtr: options?.rvtr,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; job?: { id: string } };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "queue_failed");
      setQueueMessage(`Research build queued (${data.job?.id?.slice(0, 8) ?? "job"}).`);
      void loadModel();
    } catch (err) {
      setQueueMessage(err instanceof Error ? err.message : "queue_failed");
    } finally {
      setQueueBusy(false);
    }
  }

  function applyFilter(next: Bp2FilterId) {
    setFilter(next);
  }

  function runReviewNext() {
    if (!model) return;
    const row = pickReviewNextRow(model.rows);
    if (!row?.rvtr) {
      setQueueMessage("No review items in queue.");
      return;
    }
    setFilter("needs-review");
    setSelectedId(row.id);
    window.open(researchPackageUrl(row.rvtr), "_blank", "noopener,noreferrer");
  }

  function runNextAction(row: Bp2Row) {
    switch (row.nextAction) {
      case "Assign RVTR":
        applyFilter("needs-identity");
        window.open(matchingWorkflowUrl(), "_blank", "noopener,noreferrer");
        return;
      case "Build Research":
        void startResearchQueue({ rvtr: row.rvtr ?? undefined, limit: 1 });
        return;
      case "Review Package":
      case "Fix Renderability":
        if (row.rvtr) window.open(researchPackageUrl(row.rvtr), "_blank", "noopener,noreferrer");
        return;
      case "Acquire Cover":
        window.open(coverToolsUrl(row.rvtr), "_blank", "noopener,noreferrer");
        return;
      case "Experience Ready":
        if (row.rvtr) window.open(songExperienceUrl(row.rvtr), "_blank", "noopener,noreferrer");
        return;
      default:
        return;
    }
  }

  function tierCount(tier: Bp2ResearchQueueTier): number {
    if (!model?.researchQueue?.tiers) return 0;
    const t = model.researchQueue.tiers;
    switch (tier) {
      case "sunday":
        return t.sundayMissing;
      case "top100":
        return t.top100Missing;
      case "top500":
        return t.top500Missing;
      default:
        return t.library;
    }
  }

  function copyRvtr() {
    if (!selectedRow?.rvtr) return;
    void navigator.clipboard.writeText(selectedRow.rvtr);
  }

  const coverUrl = selectedRow?.retroverseCoverUrl || selectedRow?.thumbnailUrl || null;
  const hasResearch = selectedRow?.packageStatus !== "Missing Package";

  return (
    <div className="bp2">
      <header className="bp2__header">
        <div className="bp2__header-main">
          <p className="bp2__kicker">Studio · Mission Control</p>
          <h1 className="bp2__title">Operations Center</h1>
          <p className="bp2__subtitle">Queue · health · library — everything visible from here</p>
        </div>
        <div className="bp2__header-actions">
          <Link href="/ops/browser-plus" className="bp2__nav-link">
            Classic Browser+
          </Link>
          <button type="button" className="bp2__action bp2__action--ghost" onClick={() => void loadModel()}>
            Refresh
          </button>
        </div>
      </header>

      {loading ? <p className="bp2__banner">Loading library…</p> : null}
      {error ? <p className="bp2__banner bp2__banner--error">{error}</p> : null}

      {model ? (
        <>
          <div className="bp2__ops-primary">
            {model.studioOperations ? (
              <StudioOperationsDashboard
                operations={model.studioOperations}
                jobs={model.studioQueue?.jobs}
                queuePaused={model.studioQueue?.paused}
                productionHealth={model.productionHealth}
              />
            ) : null}

            {model.studioQueue ? (
              <StudioQueuePanel
                jobs={model.studioQueue.jobs}
                paused={model.studioQueue.paused}
                busy={studioQueueBusy}
                jobPlans={model.studioOperations?.jobPlans}
                onPause={() => void studioQueueControl("pause")}
                onResume={() => void studioQueueControl("resume")}
                onCancel={(jobId) => void studioQueueControl("cancel", jobId)}
                onRetry={(jobId) => void studioQueueControl("retry", jobId)}
              />
            ) : null}

            {model.productionHealth ? (
              <StudioHealthDashboard health={model.productionHealth} />
            ) : null}

            {model.dailyReport ? (
              <StudioDailyReportPanel
                report={model.dailyReport}
                integrity={model.packageIntegrity}
              />
            ) : null}
          </div>

          <StudioBatchBar
            selectedCount={selectedIds.size}
            filteredCount={filteredRows.length}
            busy={studioQueueBusy || queueBusy}
            overnightEstimate={top100OvernightEstimate}
            onAction={handleBatchAction}
            onOvernight={handleOvernight}
            onClearSelection={() => setSelectedIds(new Set())}
          />

          {studioQueueMessage ? <p className="bp2__banner">{studioQueueMessage}</p> : null}

          <section className="bp2__readiness" aria-label="Readiness">
            {model.readinessPanels.map((panel) => (
              <div
                key={panel.id}
                className={`bp2__readiness-card ${filter === panel.missingFilter ? "bp2__readiness-card--active" : ""}`}
              >
                <button
                  type="button"
                  className="bp2__readiness-card-main"
                  onClick={() => applyFilter(panel.missingFilter)}
                >
                  <span className="bp2__readiness-label">{panel.label}</span>
                  <strong className="bp2__readiness-score">
                    {panel.ready.toLocaleString()} / {panel.total.toLocaleString()}
                  </strong>
                  <span className="bp2__readiness-pct">{panel.pct}%</span>
                </button>
                <div className="bp2__readiness-blockers">
                  <span className="bp2__readiness-blockers-title">Blocking Issues</span>
                  <ReadinessBlockersList blockers={panel.blockers} />
                </div>
                <button
                  type="button"
                  className="bp2__readiness-action"
                  onClick={() => applyFilter(panel.missingFilter)}
                >
                  {panel.actionLabel}
                </button>
              </div>
            ))}
          </section>

          <section className="bp2__operations-queues" aria-label="Work queues">
            {OPERATIONS_QUEUES.map((item) => (
              <div
                key={item.filter}
                className={`bp2__queue-card-wrap ${filter === item.filter ? "bp2__queue-card-wrap--active" : ""}`}
              >
                <button
                  type="button"
                  className={`bp2__queue-card ${filter === item.filter ? "bp2__queue-card--active" : ""}`}
                  onClick={() => applyFilter(item.filter)}
                >
                  <span className="bp2__queue-card-label">{item.label}</span>
                  <strong>{model.summary[item.summaryKey].toLocaleString()}</strong>
                  <span className="bp2__queue-card-hint">{item.hint}</span>
                </button>
                {item.filter === "no-usable-cover" ? (
                  <button
                    type="button"
                    className="bp2__queue-card-action"
                    onClick={() => applyFilter("no-usable-cover")}
                  >
                    Show Missing Covers
                  </button>
                ) : null}
                {item.filter === "needs-review" ? (
                  <button
                    type="button"
                    className="bp2__queue-card-action"
                    onClick={runReviewNext}
                  >
                    Review Next
                  </button>
                ) : null}
              </div>
            ))}
          </section>

          {model.researchQueue ? (
            <section className="bp2__automation" aria-label="Research queue">
              <div className="bp2__automation-main">
                <strong>Research Queue</strong>
                <ul className="bp2__tier-list">
                  <li>Sunday Missing: {model.researchQueue.tiers.sundayMissing.toLocaleString()}</li>
                  <li>Top 100 Missing: {model.researchQueue.tiers.top100Missing.toLocaleString()}</li>
                  <li>Top 500 Missing: {model.researchQueue.tiers.top500Missing.toLocaleString()}</li>
                  <li>Library: {model.researchQueue.tiers.library.toLocaleString()}</li>
                </ul>
                {model.researchQueue.activeJob ? (
                  <p className="bp2__muted">
                    {model.researchQueue.activeJob.status}: {model.researchQueue.activeJob.step} (
                    {model.researchQueue.activeJob.current}/{model.researchQueue.activeJob.total})
                  </p>
                ) : null}
                {queueMessage ? <p className="bp2__muted">{queueMessage}</p> : null}
              </div>
              <div className="bp2__automation-actions">
                {(["sunday", "top100", "top500", "library"] as Bp2ResearchQueueTier[]).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    className="bp2__action bp2__action--ghost"
                    disabled={queueBusy || tierCount(tier) === 0 || Boolean(model.researchQueue?.activeJob)}
                    onClick={() => void startResearchQueue({ tier, limit: 1 })}
                  >
                    {tierButtonLabel(tier)}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="bp2__operations-drawer">
            <button
              type="button"
              className="bp2__operations-toggle"
              onClick={() => setOperationsOpen((v) => !v)}
              aria-expanded={operationsOpen}
            >
              {operationsOpen ? "Hide Operations" : "Show Operations"}
            </button>
            {operationsOpen ? (
              <div className="bp2__operations-body">
                <div className="bp2__operations-stat">
                  <span>Videos</span>
                  <strong>{model.summary.videos.toLocaleString()}</strong>
                </div>
                <div className="bp2__operations-stat">
                  <span>Needs Research</span>
                  <strong>{model.summary.needsResearch.toLocaleString()}</strong>
                </div>
                <div className="bp2__operations-stat">
                  <span>Missing Metadata</span>
                  <strong>{model.summary.missingMetadata.toLocaleString()}</strong>
                </div>
                <div className="bp2__operations-stat">
                  <span>Recoverable Metadata</span>
                  <strong>{model.summary.recoverableMetadata.toLocaleString()}</strong>
                </div>
                <button
                  type="button"
                  className="bp2__action bp2__action--ghost"
                  onClick={() => setReportOpen(true)}
                >
                  Metadata Recovery Report
                </button>
                <button
                  type="button"
                  className={`bp2__filter bp2__filter--inline ${filter === "all-videos" ? "bp2__filter--active" : ""}`}
                  onClick={() => setFilter("all-videos")}
                >
                  Browse all videos ({model.summary.videos.toLocaleString()})
                </button>
              </div>
            ) : null}
          </section>

          <div className={`bp2__workspace ${filtersCollapsed ? "bp2__workspace--filters-collapsed" : ""}`}>
            <aside className="bp2__filters" aria-label="Filters">
              <div className="bp2__filters-head">
                <h2>Filters</h2>
                <button
                  type="button"
                  className="bp2__collapse"
                  onClick={() => setFiltersCollapsed((v) => !v)}
                  aria-expanded={!filtersCollapsed}
                >
                  {filtersCollapsed ? "Show" : "Hide"}
                </button>
              </div>
              {!filtersCollapsed ? (
                <>
                <ul className="bp2__filter-list">
                  {BP2_FILTERS.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`bp2__filter ${filter === item.id ? "bp2__filter--active" : ""}`}
                        onClick={() => setFilter(item.id)}
                      >
                        {item.label}
                        {counts ? <span className="bp2__filter-count">{counts[item.id]}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
                <h3 className="bp2__filter-section-title">Studio Filters</h3>
                <p className="bp2__filter-section-hint">Combine multiple — all must match</p>
                <ul className="bp2__filter-list bp2__filter-list--studio">
                  {BP2_STUDIO_FILTERS.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`bp2__filter bp2__filter--studio ${studioFilters.includes(item.id) ? "bp2__filter--active" : ""}`}
                        onClick={() => toggleStudioFilter(item.id)}
                      >
                        {item.label}
                        {studioCounts ? (
                          <span className="bp2__filter-count">{studioCounts[item.id]}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
                </>
              ) : null}
            </aside>

            <div className="bp2__main">
              <section className="bp2__inspector" aria-label="Song Inspector">
                {!selectedRow ? (
                  <p className="bp2__empty">Select a row in the browser table.</p>
                ) : (
                  <>
                    <header className="bp2__song-header">
                      <div className="bp2__cover">
                        {coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={coverUrl} alt="" />
                        ) : (
                          <span>No cover</span>
                        )}
                      </div>
                      <div className="bp2__song-header-body">
                        <p className="bp2__artist">
                          <MetadataDisplayLine row={selectedRow} field="artist" />
                        </p>
                        <h2 className="bp2__song-title">
                          <MetadataDisplayLine row={selectedRow} field="title" />
                        </h2>
                        <div className="bp2__next-action-row">
                          <span className="bp2__next-action-label">Next Action</span>
                          <span className={nextActionClass(selectedRow.nextAction)}>
                            {selectedRow.nextAction}
                          </span>
                          <button
                            type="button"
                            className="bp2__action bp2__action--compact"
                            disabled={nextActionIsDisabled(selectedRow.nextAction)}
                            onClick={() => runNextAction(selectedRow)}
                          >
                            {nextActionLabel(selectedRow.nextAction)}
                          </button>
                          <span className={priorityClass(selectedRow.patronPriority)}>
                            Priority: {selectedRow.patronPriority}
                          </span>
                        </div>
                        <div className="bp2__song-header-grid">
                          <div><span>Year</span><strong>{selectedRow.year ?? "—"}</strong></div>
                          <div><span>RVTR</span><strong>{selectedRow.rvtr ?? "—"}</strong></div>
                          <div>
                            <span>Peak</span>
                            <strong>
                              {chartSummaryLoading
                                ? "…"
                                : chartSummary?.peakPosition != null
                                  ? `#${chartSummary.peakPosition}`
                                  : "—"}
                            </strong>
                          </div>
                          <div>
                            <span>Weeks</span>
                            <strong>
                              {chartSummaryLoading ? "…" : (chartSummary?.weeksOnChart ?? "—")}
                            </strong>
                          </div>
                          <div>
                            <span>Chart Runs</span>
                            <strong>
                              {chartSummaryLoading ? "…" : (chartSummary?.chartRunCount ?? "—")}
                            </strong>
                          </div>
                          <div>
                            <span>Re-Entries</span>
                            <strong>
                              {chartSummaryLoading ? "…" : (chartSummary?.reEntryCount ?? "—")}
                            </strong>
                          </div>
                          <div>
                            <span>Research score</span>
                            <strong>
                              {researchSummary?.researchScore ?? 0}
                              <em className="bp2__score-level">{researchSummary?.researchLevel ?? "Minimal"}</em>
                            </strong>
                          </div>
                          <div>
                            <span>Experience score</span>
                            <strong>{researchSummary?.experienceScore ?? 0}</strong>
                          </div>
                        </div>
                        <div className="bp2__queue-chips bp2__queue-chips--header">
                          <WorkQueueChips row={selectedRow} />
                        </div>
                      </div>
                    </header>

                    <div className="bp2__inspector-sections">
                      <section className="bp2__panel bp2__panel--story">
                        <h3>Story</h3>
                        {pkgLoading ? <p className="bp2__muted">Loading research…</p> : null}
                        {!selectedRow.rvtr ? (
                          <p className="bp2__muted">Unidentified video — assign RVTR in Label to load story content.</p>
                        ) : blurbs.length === 0 ? (
                          <p className="bp2__muted">No story yet.</p>
                        ) : (
                          <div className="bp2__story-grid">
                            {blurbs.map((blurb) => (
                              <article key={blurb.id} className="bp2__story-card">
                                {blurb.text}
                              </article>
                            ))}
                          </div>
                        )}
                      </section>

                      <section className="bp2__panel bp2__panel--chart">
                        <h3>Chart Journey</h3>
                        {!selectedRow.rvtr ? (
                          <p className="bp2__muted">Assign RVTR to load chart journey.</p>
                        ) : chartSummaryLoading ? (
                          <p className="bp2__muted">Loading chart journey…</p>
                        ) : !chartSummary ? (
                          <p className="bp2__muted">No Hot 100 chart trajectory on file.</p>
                        ) : (
                          <ul className="bp2__kv">
                            <li><span>Peak</span><strong>{chartSummary.peakPosition != null ? `#${chartSummary.peakPosition}` : "—"}</strong></li>
                            <li><span>Weeks</span><strong>{chartSummary.weeksOnChart}</strong></li>
                            <li><span>Chart Runs</span><strong>{chartSummary.chartRunCount}</strong></li>
                            <li><span>Re-Entries</span><strong>{chartSummary.reEntryCount}</strong></li>
                            <li><span>First Chart</span><strong>{chartSummary.firstChartDate ?? "—"}</strong></li>
                            <li><span>Last Chart</span><strong>{chartSummary.lastChartDate ?? "—"}</strong></li>
                            <li><span>Biggest Climb</span><strong>{chartSummary.biggestWeeklyClimb != null ? `+${chartSummary.biggestWeeklyClimb}` : "—"}</strong></li>
                            <li><span>Biggest Drop</span><strong>{chartSummary.biggestWeeklyDrop != null ? `−${chartSummary.biggestWeeklyDrop}` : "—"}</strong></li>
                          </ul>
                        )}
                        {selectedRow.rvtr && chartSummary ? (
                          <a
                            className="bp2__action"
                            href={`/retroverse-2/song/${selectedRow.rvtr}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open Chart Fingerprint
                          </a>
                        ) : null}
                      </section>

                      <section className="bp2__panel bp2__panel--path">
                        <h3>Path To Ready</h3>
                        <ul className="bp2__path-list">
                          {selectedRow.pathToReady.steps.map((step) => (
                            <li key={step.label}>
                              <span className={step.done ? "bp2__check bp2__check--yes" : "bp2__check"}>
                                {step.done ? "✓" : "✗"}
                              </span>
                              <span>{step.label}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="bp2__path-next">
                          Next Step: <strong>{selectedRow.pathToReady.nextStep}</strong>
                        </p>
                        {!nextActionIsDisabled(selectedRow.nextAction) ? (
                          <button
                            type="button"
                            className="bp2__action"
                            onClick={() => runNextAction(selectedRow)}
                          >
                            {nextActionLabel(selectedRow.nextAction)}
                          </button>
                        ) : null}
                      </section>

                      <section className="bp2__panel bp2__panel--work">
                        <h3>Work Queue</h3>
                        <ul className="bp2__kv">
                          <li><span>Has identity?</span><strong>{selectedRow.rvtr ? "Yes" : "No"}</strong></li>
                          <li><span>Has research?</span><strong>{hasResearch ? "Yes" : "No"}</strong></li>
                          <li><span>Needs review?</span><strong>{selectedRow.workQueues.needsReview ? "Yes" : "No"}</strong></li>
                          <li><span>Usable cover?</span><strong>{selectedRow.hasUsableCover ? "Yes" : "No"}</strong></li>
                          <li><span>Experience ready?</span><strong>{selectedRow.workQueues.experienceReady ? "Yes" : "No"}</strong></li>
                          <li><span>Next action</span><strong>{selectedRow.nextAction}</strong></li>
                          <li><span>Priority</span><strong>{selectedRow.patronPriority}</strong></li>
                        </ul>
                      </section>

                      <section className="bp2__panel bp2__panel--research">
                        <h3>Research Summary</h3>
                        <ul className="bp2__kv">
                          <li><span>Facts</span><strong>{researchSummary?.factCount ?? 0}</strong></li>
                          <li><span>Stories</span><strong>{researchSummary?.storyCount ?? 0}</strong></li>
                          <li><span>Sources</span><strong>{researchSummary?.sourceCount ?? 0}</strong></li>
                          <li><span>Artifacts</span><strong>{researchSummary?.artifactReadyCount ?? 0} ready</strong></li>
                          <li><span>Last updated</span><strong>{formatDate(pkg?.updatedAt ?? null)}</strong></li>
                          <li>
                            <span>Research status</span>
                            <strong>{researchStatusLabel(selectedRow.packageStatus)}</strong>
                          </li>
                          <li><span>Experience ready</span><strong>{selectedRow.workQueues.experienceReady ? "Yes" : "No"}</strong></li>
                          <li><span>Coverage</span><strong>{researchSummary?.researchLevel ?? "—"}</strong></li>
                        </ul>
                        {hasResearch ? (
                          <div className="bp2__story-add">
                            <input
                              type="text"
                              value={storyLine}
                              onChange={(e) => setStoryLine(e.target.value)}
                              placeholder="Add a story line…"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") void saveStoryLine();
                              }}
                            />
                            <button
                              type="button"
                              className="bp2__action"
                              disabled={storySaving || !storyLine.trim()}
                              onClick={() => void saveStoryLine()}
                            >
                              {storySaving ? "Saving…" : "Add line"}
                            </button>
                          </div>
                        ) : null}
                        {storyMessage ? <p className="bp2__muted">{storyMessage}</p> : null}
                        <ul className="bp2__artifact-list bp2__artifact-list--compact">
                          {artifacts.map((item) => (
                            <li key={item.label}>
                              <span className={item.ready ? "bp2__check bp2__check--yes" : "bp2__check"}>
                                {item.ready ? "✓" : "·"}
                              </span>
                              <span>{item.label}</span>
                              <strong>{item.detail}</strong>
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section className="bp2__panel bp2__panel--studio">
                        <h3>Studio Status</h3>
                        <ul className="bp2__kv">
                          <li><span>Stage</span><strong className={studioStageClass(selectedRow.studio.stage)}>{selectedRow.studio.statusLabel}</strong></li>
                          <li><span>Patron Value</span><strong>{selectedRow.studio.patronValue ?? "—"}</strong></li>
                          <li><span>Story</span><strong>{selectedRow.studio.storyStatus}</strong></li>
                          <li><span>Confidence</span><strong>{selectedRow.studio.confidenceLabel}</strong></li>
                          <li><span>Performances</span><strong>{selectedRow.studio.performanceCount}</strong></li>
                          <li><span>Assets</span><strong>{selectedRow.studio.approvedAssetCount}</strong></li>
                          <li><span>Last updated</span><strong>{formatDateTime(selectedRow.studio.lastUpdated)}</strong></li>
                          <li><span>Package versions</span><strong>C {selectedRow.studio.packageVersions.collector ?? "—"} · E {selectedRow.studio.packageVersions.editor ?? "—"} · D {selectedRow.studio.packageVersions.director ?? "—"}</strong></li>
                          {selectedRow.studio.recommendedPerformance ? (
                            <li><span>Recommended perf</span><strong>{selectedRow.studio.recommendedPerformance}</strong></li>
                          ) : null}
                          {selectedRow.studio.renderReadiness ? (
                            <li><span>Render</span><strong>{selectedRow.studio.renderReadiness}</strong></li>
                          ) : null}
                        </ul>
                        {selectedRow.studio.missingItems.length > 0 ? (
                          <div className="bp2__studio-missing">
                            <span className="bp2__muted">Missing:</span>
                            <ul>
                              {selectedRow.studio.missingItems.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </section>

                      <section className="bp2__panel bp2__panel--actions">
                        <h3>Studio Actions</h3>
                        <div className="bp2__actions">
                          {selectedRow.rvtr ? (
                            <>
                              <a className="bp2__action" href={collectorUrl(selectedRow.rvtr)} target="_blank" rel="noreferrer">
                                Open Collector
                              </a>
                              <a className="bp2__action" href={editorUrl(selectedRow.rvtr)} target="_blank" rel="noreferrer">
                                Open Editor
                              </a>
                              <a className="bp2__action" href={directorUrl(selectedRow.rvtr)} target="_blank" rel="noreferrer">
                                Open Director
                              </a>
                              <a className="bp2__action bp2__action--ghost" href={experiencePlanUrl(selectedRow.rvtr)} target="_blank" rel="noreferrer">
                                View Experience Plan
                              </a>
                            </>
                          ) : null}
                          <a className="bp2__action bp2__action--ghost" href="/ops/browser-plus" target="_blank" rel="noreferrer">
                            Play in VirtualDJ
                          </a>
                        </div>
                      </section>

                      <section className="bp2__panel bp2__panel--actions">
                        <h3>Intelligence Actions</h3>
                        <div className="bp2__actions">
                          {selectedRow.rvtr ? (
                            <a
                              className="bp2__action"
                              href={`/retroverse-2/song/${selectedRow.rvtr}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Song
                            </a>
                          ) : (
                            <button type="button" className="bp2__action" disabled>
                              Open Song
                            </button>
                          )}
                          {selectedRow.rvtr ? (
                            <a
                              className="bp2__action bp2__action--ghost"
                              href={`/ops/intelligence/package/${selectedRow.rvtr}`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Open Research
                            </a>
                          ) : null}
                          <a
                            className="bp2__action bp2__action--ghost"
                            href="/retroverse-2/live"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Live View
                          </a>
                          <button
                            type="button"
                            className="bp2__action bp2__action--ghost"
                            onClick={copyRvtr}
                            disabled={!selectedRow.rvtr}
                          >
                            Copy RVTR
                          </button>
                        </div>
                      </section>

                      <section className="bp2__panel bp2__panel--vdj">
                        <h3>VirtualDJ</h3>
                        <ul className="bp2__kv">
                          <li><span>Label</span><strong>{selectedRow.label || "—"}</strong></li>
                          <li><span>Grouping</span><strong>{selectedRow.grouping || "—"}</strong></li>
                          <li><span>RV Tags</span><strong>{selectedRow.user2 || "—"}</strong></li>
                          <li><span>File path</span><strong className="bp2__path">{selectedRow.filePath}</strong></li>
                          <li><span>Plays</span><strong>{selectedRow.playCount ?? 0}</strong></li>
                          <li><span>First seen</span><strong>{formatDate(selectedRow.firstSeen)}</strong></li>
                          <li><span>Last played</span><strong>{formatDate(selectedRow.lastPlay)}</strong></li>
                        </ul>
                      </section>

                      {selectedRow.missingXmlMetadata ? (
                        <MetadataRecoveryPanel row={selectedRow} impact={model.metadataImpact} />
                      ) : null}
                    </div>
                  </>
                )}
              </section>

              <section className="bp2__browser" aria-label="Library Browser">
                <div className="bp2__browser-head">
                  <h2>Library Browser</h2>
                  <span>{filteredRows.length.toLocaleString()} rows</span>
                  <button type="button" className="bp2__action bp2__action--ghost" onClick={toggleSelectAllFiltered}>
                    {filteredRows.length > 0 && filteredRows.every((r) => selectedIds.has(r.id))
                      ? "Deselect all"
                      : "Select filtered"}
                  </button>
                </div>
                <div className="bp2__table-wrap">
                  <table className="bp2__table bp2__table--studio">
                    <thead>
                      <tr>
                        <th aria-label="Select" />
                        <th>Artist</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Patron</th>
                        <th>Confidence</th>
                        <th>Story</th>
                        <th>Perf</th>
                        <th>Assets</th>
                        <th>Updated</th>
                        <th>Versions</th>
                        <th>Plays</th>
                        <th>RVTR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row) => (
                        <tr
                          key={row.id}
                          className={`${row.id === selectedRow?.id ? "bp2__row--selected" : ""} ${selectedIds.has(row.id) ? "bp2__row--checked" : ""}`}
                          onClick={() => setSelectedId(row.id)}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(row.id)}
                              onChange={() => toggleRowSelection(row.id, false)}
                              aria-label={`Select ${row.artist} — ${row.title}`}
                            />
                          </td>
                          <td><MetadataDisplayCell row={row} field="artist" /></td>
                          <td><MetadataDisplayCell row={row} field="title" /></td>
                          <td><span className={studioStageClass(row.studio.stage)}>{row.studio.statusLabel}</span></td>
                          <td>{row.studio.patronValue ?? "—"}</td>
                          <td>{row.studio.confidenceLabel}</td>
                          <td>{row.studio.storyStatus}</td>
                          <td>{row.studio.performanceCount}</td>
                          <td>{row.studio.approvedAssetCount}</td>
                          <td>{formatDate(row.studio.lastUpdated)}</td>
                          <td className="bp2__versions">
                            {row.studio.packageVersions.collector ? "C" : "·"}
                            {row.studio.packageVersions.editor ? "E" : "·"}
                            {row.studio.packageVersions.director ? "D" : "·"}
                          </td>
                          <td>{row.playCount ?? 0}</td>
                          <td>{row.rvtr ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>

          <MetadataRecoveryReport
            rows={model.metadataRecoveryReport}
            open={reportOpen}
            onToggle={() => setReportOpen((v) => !v)}
          />
        </>
      ) : null}
    </div>
  );
}
