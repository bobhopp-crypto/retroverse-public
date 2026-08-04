"use client";

import { useMemo, useState, useEffect } from "react";

import type {
  BillboardChartOptions,
  BillboardSetType,
  CandidateEvidence,
  ChartCoverageResult,
  ChartCoverageScan,
  CoverageDecisionAction,
  CoverageDecisionAxis,
  CoverageScanIndexEntry,
  InventorySummary,
} from "@/lib/ops/virtualdj-media-coverage/types";

type CoverageFilter =
  | "all"
  | "audio_ready"
  | "audio_review"
  | "audio_upgrade"
  | "audio_alternate"
  | "audio_missing"
  | "video_ready"
  | "video_review"
  | "video_alternate"
  | "video_missing"
  | "both_missing"
  | "audio_ready_video_missing"
  | "unresolved";

type ApiBody = {
  ok?: boolean;
  error?: string;
  options?: BillboardChartOptions;
  inventory?: InventorySummary;
  scans?: CoverageScanIndexEntry[];
  scan?: ChartCoverageScan;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const FILTER_LABELS: Record<CoverageFilter, string> = {
  all: "All targets",
  audio_ready: "Audio ready",
  audio_review: "Audio review",
  audio_upgrade: "Audio upgrade",
  audio_alternate: "Audio alternate",
  audio_missing: "Audio missing",
  video_ready: "Video ready",
  video_review: "Video review",
  video_alternate: "Video alternate",
  video_missing: "Video missing",
  both_missing: "Both missing",
  audio_ready_video_missing: "Audio ready / video missing",
  unresolved: "Unresolved identity",
};

async function readApiResponse(response: Response): Promise<ApiBody> {
  const text = await response.text();
  if (!text) return { ok: response.ok };
  try {
    return JSON.parse(text) as ApiBody;
  } catch {
    return {
      ok: false,
      error: response.ok
        ? "The server returned an unreadable response."
        : text.trim() || `Request failed (${response.status}).`,
    };
  }
}

function formatNumber(value: number | null | undefined): string {
  return value == null ? "—" : value.toLocaleString();
}

function formatBitRate(value: number | null | undefined): string {
  return value == null ? "—" : `${Math.round(value / 1000)} kbps`;
}

function formatDuration(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const seconds = Math.max(0, Math.round(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function shortPath(path: string | null | undefined): string {
  if (!path) return "—";
  const parts = path.split("/");
  return parts.length > 4 ? `…/${parts.slice(-3).join("/")}` : path;
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusClass(status: string): string {
  return `vmc-status vmc-status--${status}`;
}

function inventoryStrip(inventory: InventorySummary | null) {
  if (!inventory) {
    return <p className="vmc-muted vmc-inventory-loading">Inventory evidence appears after the XML-first scan.</p>;
  }
  return (
    <div className="vmc-inventory" aria-label="VirtualDJ inventory summary">
      <div><strong>{formatNumber(inventory.xmlEntries)}</strong><span>XML entries</span></div>
      <div><strong>{formatNumber(inventory.managedMusic)}</strong><span>Managed MUSIC</span></div>
      <div><strong>{formatNumber(inventory.managedVideo)}</strong><span>Managed VIDEO</span></div>
      <div><strong>{formatNumber(inventory.videoVaultExcluded)}</strong><span>VIDEO VAULT excluded</span></div>
      <div><strong>{formatNumber(inventory.outsideManagedLibrary)}</strong><span>Outside managed</span></div>
      <div><strong>{new Date(inventory.fingerprintTime).toLocaleString()}</strong><span>XML fingerprint time</span></div>
    </div>
  );
}

function resultMatchesFilter(result: ChartCoverageResult, filter: CoverageFilter): boolean {
  if (filter === "all") return true;
  if (filter === "unresolved") return result.target.unresolvedIdentity;
  if (filter === "both_missing") {
    return result.audio.effectiveStatus === "missing" && result.video.effectiveStatus === "missing";
  }
  if (filter === "audio_ready_video_missing") {
    return result.audio.effectiveStatus === "ready" && result.video.effectiveStatus === "missing";
  }
  const [axis, status] = filter.split("_", 2);
  if (axis === "audio") {
    const expected = status === "upgrade" ? "upgrade_recommended" : status;
    return result.audio.effectiveStatus === expected;
  }
  return result.video.effectiveStatus === status;
}

function videoAcquisitionHref(result: ChartCoverageResult, scan: ChartCoverageScan): string | null {
  if (
    result.target.unresolvedIdentity ||
    result.video.effectiveStatus !== "missing" ||
    !/^RVTR\d{6}$/.test(result.target.rvtr ?? "")
  ) {
    return null;
  }
  const query = `${result.target.artist} ${result.target.title} official video`;
  const params = new URLSearchParams({
    rvtr: result.target.rvtr!,
    from: "virtualdj-media-coverage",
    source: result.target.chartSource,
    year: String(result.target.selectedYear),
    rank: String(result.target.bestRank),
    scan: scan.id,
    videoCoverage: result.video.effectiveStatus,
    query,
  });
  if (result.target.chartDate) params.set("chartDate", result.target.chartDate);
  return `/bobos/song-workspace?${params.toString()}`;
}

function CandidateList({
  candidates,
  audioPath,
  videoPath,
  setAudioPath,
  setVideoPath,
}: {
  candidates: CandidateEvidence[];
  audioPath: string | null;
  videoPath: string | null;
  setAudioPath: (path: string) => void;
  setVideoPath: (path: string) => void;
}) {
  if (candidates.length === 0) return <p className="vmc-muted">No VirtualDJ XML candidate was found.</p>;
  return (
    <div className="vmc-candidates">
      {candidates.map((candidate) => (
        <article className="vmc-candidate" key={`${candidate.entryIndex}-${candidate.filePath}`}>
          <div className="vmc-candidate__title">
            <strong>{candidate.artist} — {candidate.title}</strong>
            <span className={`vmc-root vmc-root--${candidate.managedClass}`}>{candidate.managedClass}</span>
          </div>
          <p>{candidate.filePath}</p>
          <p>
            {candidate.matchMethod} · score {candidate.score} · file {
              candidate.fileExists == null ? "not checked" : candidate.fileExists ? "exists" : "missing"
            }
          </p>
          <p>Version: {candidate.versionMarkers.join(", ")}{candidate.versionReason ? ` · ${candidate.versionReason}` : ""}</p>
          <p>Evidence: {candidate.evidence.join("; ") || "metadata candidate"}</p>
          <p>
            Components: RVTR {candidate.componentScores.rvtr}, structured {candidate.componentScores.structured},
            artist {candidate.componentScores.artist}, title {candidate.componentScores.title},
            album {candidate.componentScores.album}, year {candidate.componentScores.year},
            filename {candidate.componentScores.filename}, version {candidate.componentScores.version}
          </p>
          {candidate.probe ? (
            <p>
              Audio: {candidate.probe.ok ? "readable" : candidate.probe.error} · {candidate.probe.codecName ?? "codec —"} ·
              {" "}{formatBitRate(candidate.probe.streamBitRate ?? candidate.probe.formatBitRate)} ·
              {" "}{candidate.probe.sampleRate ?? "—"} Hz · {candidate.probe.channels ?? "—"} ch ·
              {" "}{formatDuration(candidate.probe.durationSeconds)}
            </p>
          ) : null}
          {candidate.managedClass === "managed_audio" ? (
            <label className="vmc-candidate__choice">
              <input
                type="radio"
                name="audio-candidate"
                checked={audioPath === candidate.filePath}
                onChange={() => setAudioPath(candidate.filePath)}
              />
              Use for audio decision
            </label>
          ) : null}
          {candidate.managedClass === "managed_video" ? (
            <label className="vmc-candidate__choice">
              <input
                type="radio"
                name="video-candidate"
                checked={videoPath === candidate.filePath}
                onChange={() => setVideoPath(candidate.filePath)}
              />
              Use for video decision
            </label>
          ) : null}
        </article>
      ))}
    </div>
  );
}

const AUDIO_DECISIONS: Array<{ action: CoverageDecisionAction; label: string }> = [
  { action: "accept_ready", label: "Accept audio ready" },
  { action: "require_review", label: "Require listening review" },
  { action: "mark_upgrade_recommended", label: "Mark audio upgrade" },
  { action: "accept_expected_alternate", label: "Accept audio alternate" },
  { action: "reject_candidate", label: "Reject audio candidate" },
  { action: "mark_missing", label: "Mark audio missing" },
  { action: "skip", label: "Skip audio" },
  { action: "clear_decision", label: "Clear audio decision" },
];

const VIDEO_DECISIONS: Array<{ action: CoverageDecisionAction; label: string }> = [
  { action: "accept_ready", label: "Accept video ready" },
  { action: "require_review", label: "Require video review" },
  { action: "accept_expected_alternate", label: "Accept video alternate" },
  { action: "reject_candidate", label: "Reject video candidate" },
  { action: "mark_missing", label: "Mark video missing" },
  { action: "skip", label: "Skip video" },
  { action: "clear_decision", label: "Clear video decision" },
];

function DetailDrawer({
  result,
  scan,
  busy,
  onClose,
  onDecision,
}: {
  result: ChartCoverageResult;
  scan: ChartCoverageScan;
  busy: boolean;
  onClose: () => void;
  onDecision: (
    axis: CoverageDecisionAxis,
    action: CoverageDecisionAction,
    note: string,
    selectedPath: string | null,
  ) => void;
}) {
  const [note, setNote] = useState("");
  const [audioPath, setAudioPath] = useState(result.audio.currentDecision?.selectedPath ?? result.audio.winnerPath);
  const [videoPath, setVideoPath] = useState(result.video.currentDecision?.selectedPath ?? result.video.winnerPath);
  const handoff = videoAcquisitionHref(result, scan);
  return (
    <aside className="vmc-drawer" aria-label={`Coverage details for ${result.target.title}`}>
      <div className="vmc-drawer__head">
        <div>
          <p className="vmc-kicker">Billboard Hot 100 · best rank #{result.target.bestRank}</p>
          <h2>{result.target.title}</h2>
          <p>{result.target.artist}</p>
        </div>
        <button className="vmc-button vmc-button--quiet" type="button" onClick={onClose}>Close</button>
      </div>

      <div className="vmc-detail-grid">
        <section>
          <h3>Billboard evidence</h3>
          <dl>
            <dt>Set</dt><dd>{scan.selection.label}</dd>
            <dt>Best rank</dt><dd>#{result.target.bestRank}</dd>
            <dt>Appearances</dt><dd>{result.target.appearanceCount}</dd>
            <dt>First / last</dt><dd>{result.target.firstChartDate} / {result.target.lastChartDate}</dd>
            <dt>Graph track</dt><dd>{result.target.graphTrackId}</dd>
            <dt>Canonical track</dt><dd>{result.target.canonicalTrackId ?? "Unresolved"}</dd>
            <dt>RVTR</dt><dd>{result.target.rvtr ?? "Unresolved"}</dd>
            <dt>Album / year</dt><dd>{result.target.album ?? "—"} · {result.target.year ?? "—"}</dd>
          </dl>
          {result.target.unresolvedIdentity ? <p className="vmc-warning">Billboard canonical identity is unresolved.</p> : null}
        </section>
        <section>
          <h3>Independent results</h3>
          <dl>
            <dt>Audio</dt><dd><span className={statusClass(result.audio.effectiveStatus)}>{statusLabel(result.audio.effectiveStatus)}</span></dd>
            <dt>Audio margin</dt><dd>{result.audio.runnerUpMargin ?? "—"}</dd>
            <dt>Video</dt><dd><span className={statusClass(result.video.effectiveStatus)}>{statusLabel(result.video.effectiveStatus)}</span></dd>
            <dt>Video margin</dt><dd>{result.video.runnerUpMargin ?? "—"}</dd>
          </dl>
          <p><strong>Audio:</strong> {result.audio.statusReason}</p>
          <p><strong>Video:</strong> {result.video.statusReason}</p>
        </section>
      </div>

      <section>
        <h3>VirtualDJ XML candidates ({result.candidates.length})</h3>
        <CandidateList
          candidates={result.candidates}
          audioPath={audioPath}
          videoPath={videoPath}
          setAudioPath={setAudioPath}
          setVideoPath={setVideoPath}
        />
      </section>

      <div className="vmc-detail-grid">
        <section>
          <h3>Audio evidence</h3>
          {result.audio.technicalWarnings.length ? (
            <ul>{result.audio.technicalWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          ) : <p className="vmc-muted">No automatic audio warnings.</p>}
          {result.audio.reviewReason ? <p className="vmc-warning">{result.audio.reviewReason}</p> : null}
          {result.audio.effectiveStatus === "review" ? (
            <p className="vmc-listening">Listening check: beginning · middle · loud passage · ending.</p>
          ) : null}
        </section>
        <section>
          <h3>Video evidence</h3>
          {result.video.warnings.length ? (
            <ul>{result.video.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          ) : <p className="vmc-muted">No automatic video warnings.</p>}
          {result.video.reviewReason ? <p className="vmc-warning">{result.video.reviewReason}</p> : null}
          {handoff ? <a className="vmc-button vmc-button--primary vmc-handoff" href={handoff}>Open in Video Acquisition</a> : null}
        </section>
      </div>

      <section>
        <h3>Operator decisions</h3>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add an auditable note" rows={3} />
        <h4>Audio decision</h4>
        <div className="vmc-actions">
          {AUDIO_DECISIONS.map((decision) => (
            <button
              className="vmc-button"
              disabled={busy}
              key={decision.action}
              onClick={() => onDecision("audio", decision.action, note, audioPath)}
              type="button"
            >
              {decision.label}
            </button>
          ))}
        </div>
        <h4>Video decision</h4>
        <div className="vmc-actions">
          {VIDEO_DECISIONS.map((decision) => (
            <button
              className="vmc-button"
              disabled={busy}
              key={decision.action}
              onClick={() => onDecision("video", decision.action, note, videoPath)}
              type="button"
            >
              {decision.label}
            </button>
          ))}
        </div>
        <h4>Decision history</h4>
        {[...result.audio.decisionHistory, ...result.video.decisionHistory]
          .sort((a, b) => b.at.localeCompare(a.at))
          .map((event, index) => (
            <p className="vmc-history-event" key={`${event.axis}-${event.at}-${index}`}>
              <strong>{event.axis} · {statusLabel(event.action)}</strong> · {new Date(event.at).toLocaleString()}
              {event.requiresConfirmation ? " · confirmation required" : ""}
              {event.note ? <span>{event.note}</span> : null}
            </p>
          ))}
      </section>
    </aside>
  );
}

export function VirtualDjMediaCoverage() {
  const [options, setOptions] = useState<BillboardChartOptions | null>(null);
  const [savedScans, setSavedScans] = useState<CoverageScanIndexEntry[]>([]);
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [setType, setSetType] = useState<BillboardSetType>("chart_week");
  const [year, setYear] = useState(0);
  const [month, setMonth] = useState(0);
  const [chartDate, setChartDate] = useState("");
  const [scan, setScan] = useState<ChartCoverageScan | null>(null);
  const [detailsKey, setDetailsKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<CoverageFilter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/ops/virtualdj-media-coverage/chart-options", { cache: "no-store" }).then(readApiResponse),
      fetch("/api/ops/virtualdj-media-coverage/scans", { cache: "no-store" }).then(readApiResponse),
    ])
      .then(([optionsBody, scansBody]) => {
        if (!optionsBody.ok || !optionsBody.options) {
          throw new Error(optionsBody.error ?? "Could not load Billboard chart options");
        }
        setOptions(optionsBody.options);
        setInventory(optionsBody.inventory ?? null);
        const firstWeek = optionsBody.options.weeks[0];
        if (firstWeek) {
          setYear(firstWeek.year);
          setMonth(firstWeek.month);
          setChartDate(firstWeek.chartDate);
        }
        if (scansBody.ok) setSavedScans(scansBody.scans ?? []);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  const yearWeeks = useMemo(
    () => options?.weeks.filter((week) => week.year === year) ?? [],
    [options, year],
  );
  const availableMonths = useMemo(
    () => [...new Set(yearWeeks.map((week) => week.month))].sort((a, b) => a - b),
    [yearWeeks],
  );
  const monthWeeks = useMemo(
    () => yearWeeks.filter((week) => week.month === month),
    [yearWeeks, month],
  );
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (scan?.results ?? []).filter((result) => {
      if (!resultMatchesFilter(result, filter)) return false;
      if (!needle) return true;
      return `${result.target.artist} ${result.target.title} ${result.rvtr ?? ""} ${result.target.graphTrackId}`
        .toLowerCase()
        .includes(needle);
    });
  }, [filter, query, scan]);
  const details = scan?.results.find((result) => result.target.targetRowKey === detailsKey) ?? null;

  function chooseYear(nextYear: number) {
    setYear(nextYear);
    const first = options?.weeks.find((week) => week.year === nextYear);
    if (first) {
      setMonth(first.month);
      setChartDate(first.chartDate);
    }
  }

  function chooseMonth(nextMonth: number) {
    setMonth(nextMonth);
    const first = yearWeeks.find((week) => week.month === nextMonth);
    if (first) setChartDate(first.chartDate);
  }

  async function runScan() {
    if (!year || busy || (setType === "chart_week" && !chartDate)) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/ops/virtualdj-media-coverage/scans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setType, year, chartDate: setType === "chart_week" ? chartDate : null }),
      });
      const body = await readApiResponse(response);
      if (!response.ok || !body.ok || !body.scan) throw new Error(body.error ?? "Coverage scan failed");
      setScan(body.scan);
      setInventory(body.scan.inventory);
      setDetailsKey(null);
      setFilter("all");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function loadScan(scanId: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/ops/virtualdj-media-coverage/scans/${encodeURIComponent(scanId)}`, {
        cache: "no-store",
      });
      const body = await readApiResponse(response);
      if (!response.ok || !body.ok || !body.scan) throw new Error(body.error ?? "Could not load scan");
      setScan(body.scan);
      setInventory(body.scan.inventory);
      setSetType(body.scan.selection.setType);
      chooseYear(body.scan.selection.year);
      if (body.scan.selection.chartDate) {
        setMonth(Number(body.scan.selection.chartDate.slice(5, 7)));
        setChartDate(body.scan.selection.chartDate);
      }
      setDetailsKey(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  async function saveDecision(
    axis: CoverageDecisionAxis,
    action: CoverageDecisionAction,
    note: string,
    selectedPath: string | null,
  ) {
    if (!scan || !details || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/ops/virtualdj-media-coverage/scans/${encodeURIComponent(scan.id)}/decisions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            targetRowKey: details.target.targetRowKey,
            axis,
            action,
            note,
            selectedPath,
          }),
        },
      );
      const body = await readApiResponse(response);
      if (!response.ok || !body.ok || !body.scan) throw new Error(body.error ?? "Could not save decision");
      setScan(body.scan);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  }

  const summaryCards = scan
    ? [
        ["Target songs", scan.summary.targetSongs, "all"],
        ["Unresolved identities", scan.summary.unresolvedIdentities, "unresolved"],
        ["Audio ready", scan.summary.audioReady, "audio_ready"],
        ["Audio review", scan.summary.audioReview, "audio_review"],
        ["Audio upgrade", scan.summary.audioUpgradeRecommended, "audio_upgrade"],
        ["Audio alternate", scan.summary.audioAlternateOnly, "audio_alternate"],
        ["Audio missing", scan.summary.audioMissing, "audio_missing"],
        ["Video ready", scan.summary.videoReady, "video_ready"],
        ["Video review", scan.summary.videoReview, "video_review"],
        ["Video alternate", scan.summary.videoAlternateOnly, "video_alternate"],
        ["Video missing", scan.summary.videoMissing, "video_missing"],
      ] as const
    : [];

  return (
    <main className="vmc-page">
      <header className="vmc-hero">
        <p className="vmc-kicker">BobOS · Billboard-to-library assessment</p>
        <h1>VirtualDJ Media Coverage</h1>
        <p>
          Billboard defines the target. Complete VirtualDJ XML defines ownership. Audio and video are evaluated independently.
        </p>
      </header>

      {inventoryStrip(inventory)}

      <section className="vmc-controls" aria-label="Billboard chart controls">
        <label>
          <span>Chart source</span>
          <select disabled value="Billboard Hot 100"><option>Billboard Hot 100</option></select>
        </label>
        <label>
          <span>Set type</span>
          <select value={setType} onChange={(event) => setSetType(event.target.value as BillboardSetType)} disabled={busy}>
            <option value="chart_week">One week</option>
            <option value="chart_year">Full year</option>
          </select>
        </label>
        <label>
          <span>Year</span>
          <select value={year || ""} onChange={(event) => chooseYear(Number(event.target.value))} disabled={busy || !options}>
            {(options?.years ?? []).map((option) => <option value={option} key={option}>{option}</option>)}
          </select>
        </label>
        {setType === "chart_week" ? (
          <>
            <label>
              <span>Month</span>
              <select value={month || ""} onChange={(event) => chooseMonth(Number(event.target.value))} disabled={busy || !options}>
                {availableMonths.map((option) => <option value={option} key={option}>{MONTHS[option - 1]}</option>)}
              </select>
            </label>
            <label>
              <span>Valid chart week</span>
              <select value={chartDate} onChange={(event) => setChartDate(event.target.value)} disabled={busy || !options}>
                {monthWeeks.map((option) => (
                  <option value={option.chartDate} key={option.chartDate}>
                    {option.chartDate} · {option.rowCount} rows · {option.resolvedRvtrCount} RVTR
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <button className="vmc-button vmc-button--primary" onClick={runScan} disabled={busy || !year || (setType === "chart_week" && !chartDate)} type="button">
          {busy ? "Scanning…" : "Scan VirtualDJ Library"}
        </button>
        {savedScans.length ? (
          <label>
            <span>Resume chart scan</span>
            <select defaultValue="" onChange={(event) => event.target.value && void loadScan(event.target.value)} disabled={busy}>
              <option value="">Choose a saved scan</option>
              {savedScans.map((item) => (
                <option value={item.id} key={item.id}>{item.label ?? item.id} · {new Date(item.updatedAt).toLocaleString()}</option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      {error ? <p className="vmc-error" role="alert">{error}</p> : null}

      {scan ? (
        <>
          <section className="vmc-summary vmc-summary--coverage" aria-label="Coverage summary">
            {summaryCards.map(([label, value, nextFilter]) => (
              <button className="vmc-summary__card" key={label} onClick={() => setFilter(nextFilter)} type="button">
                <strong>{value}</strong><span>{label}</span>
              </button>
            ))}
          </section>
          <section className="vmc-results">
            <div className="vmc-results__tools">
              <div>
                <h2>{scan.selection.label}</h2>
                <p>{scan.summary.audioDecisions} audio decisions · {scan.summary.videoDecisions} video decisions</p>
              </div>
              <label>
                <span className="vmc-sr-only">Filter coverage</span>
                <select value={filter} onChange={(event) => setFilter(event.target.value as CoverageFilter)}>
                  {Object.entries(FILTER_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search artist, title, RVTR, graph ID" />
            </div>
            <div className="vmc-table-wrap">
              <table className="vmc-coverage-table">
                <thead><tr><th>Rank</th><th>Song / Artist</th><th>Audio</th><th>Video</th><th>Chart weeks</th><th>Action</th></tr></thead>
                <tbody>
                  {visible.map((result) => {
                    const handoff = videoAcquisitionHref(result, scan);
                    return (
                      <tr key={result.target.targetRowKey}>
                        <td className="vmc-rank">#{result.target.bestRank}</td>
                        <td>
                          <strong>{result.target.title}</strong>
                          <span className="vmc-row-artist">{result.target.artist}</span>
                          {result.target.unresolvedIdentity ? <span className="vmc-unresolved">Unresolved identity</span> : null}
                        </td>
                        <td><span className={statusClass(result.audio.effectiveStatus)}>{statusLabel(result.audio.effectiveStatus)}</span></td>
                        <td><span className={statusClass(result.video.effectiveStatus)}>{statusLabel(result.video.effectiveStatus)}</span></td>
                        <td>{result.target.appearanceCount}<span className="vmc-row-artist">{result.target.firstChartDate} – {result.target.lastChartDate}</span></td>
                        <td>
                          <div className="vmc-row-actions">
                            <button className="vmc-button vmc-button--quiet" onClick={() => setDetailsKey(result.target.targetRowKey)} type="button">Details</button>
                            {handoff ? <a className="vmc-button vmc-button--quiet" href={handoff}>Video Acquisition</a> : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="vmc-empty">
          <h2>Select a Billboard Hot 100 week or year</h2>
          <p>Every selected chart identity will be compared with the complete VirtualDJ XML inventory.</p>
        </section>
      )}

      {details && scan ? (
        <DetailDrawer
          key={details.target.targetRowKey}
          result={details}
          scan={scan}
          busy={busy}
          onClose={() => setDetailsKey(null)}
          onDecision={saveDecision}
        />
      ) : null}
    </main>
  );
}
