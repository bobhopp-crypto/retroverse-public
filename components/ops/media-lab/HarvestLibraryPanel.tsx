"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { subjectFromTitle } from "@/lib/ops/media-lab/harvest/filenames";

type HarvestClipEntry = {
  id: string;
  title: string;
  type: string;
  sourceProgram: string;
  sourceFile: string;
  inSec: number;
  outSec: number;
  durationSec: number;
  exportedAt: string;
  chapterId: string;
  exportedPath: string;
};

type HarvestTypeGroup = {
  type: string;
  count: number;
  clips: HarvestClipEntry[];
};

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatExportDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type HarvestLibraryPanelProps = {
  refreshKey?: number;
  onClose?: () => void;
};

export function HarvestLibraryPanel(props: HarvestLibraryPanelProps) {
  const [groups, setGroups] = useState<HarvestTypeGroup[]>([]);
  const [libraryRoot, setLibraryRoot] = useState("");
  const [totalClips, setTotalClips] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState<HarvestClipEntry | null>(null);
  const [metadata, setMetadata] = useState<HarvestClipEntry | null>(null);
  const [busyPath, setBusyPath] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/media-lab/harvest-library");
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        groups?: HarvestTypeGroup[];
        libraryRoot?: string;
        totalClips?: number;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not load harvest library");
      }
      setGroups(data.groups ?? []);
      setLibraryRoot(data.libraryRoot ?? "");
      setTotalClips(data.totalClips ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
      setGroups([]);
      setTotalClips(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, props.refreshKey]);

  const typeChips = useMemo(
    () => groups.map((g) => ({ type: g.type, count: g.count })),
    [groups],
  );

  async function revealInFinder(relativePath: string) {
    setBusyPath(relativePath);
    try {
      const res = await fetch("/api/ops/media-lab/harvest-library/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ relativePath }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not reveal in Finder");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reveal failed");
    } finally {
      setBusyPath(null);
    }
  }

  return (
    <section className="ops-ml-harvest" aria-label="Harvest library">
      <header className="ops-ml-harvest__head">
        <h4 className="ops-ml-harvest__label">Harvest Library</h4>
        <span className="ops-ml-harvest__count">{totalClips} clips</span>
        <button
          type="button"
          className="ops-ml-harvest__refresh"
          aria-label="Refresh harvest library"
          onClick={() => void load()}
        >
          ↻
        </button>
        {props.onClose ? (
          <button
            type="button"
            className="ops-ml-harvest__close"
            aria-label="Close harvest library"
            onClick={() => props.onClose?.()}
          >
            ×
          </button>
        ) : null}
      </header>

      {libraryRoot ? (
        <p className="ops-ml-harvest__root ops-mono" title={libraryRoot}>
          {libraryRoot.replace(/^\/Users\/[^/]+/, "~")}
        </p>
      ) : null}

      {loading ? <p className="ops-ml-harvest__empty">Loading…</p> : null}
      {error ? (
        <p className="ops-ml-harvest__error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && groups.length === 0 ? (
        <p className="ops-ml-harvest__empty">No harvested clips yet. Export your queue to begin.</p>
      ) : null}

      {typeChips.length > 0 ? (
        <div className="ops-ml-harvest__chips">
          {typeChips.map((chip) => (
            <button
              key={chip.type}
              type="button"
              className={`ops-ml-harvest__chip${
                collapsed[chip.type] ? "" : " ops-ml-harvest__chip--on"
              }`}
              onClick={() =>
                setCollapsed((prev) => ({ ...prev, [chip.type]: !prev[chip.type] }))
              }
            >
              {chip.type} ({chip.count})
            </button>
          ))}
        </div>
      ) : null}

      <div className="ops-ml-harvest__groups">
        {groups.map((group) => (
          <details
            key={group.type}
            className="ops-ml-harvest__group"
            open={!collapsed[group.type]}
          >
            <summary className="ops-ml-harvest__group-head">{group.type} ({group.count})</summary>
            <ul className="ops-ml-harvest__list">
              {group.clips.map((clip) => {
                const displayName = subjectFromTitle(clip.title);
                return (
                  <li key={clip.id} className="ops-ml-harvest__item">
                    <div className="ops-ml-harvest__item-main">
                      <span className="ops-ml-harvest__item-title">{displayName}</span>
                      <span className="ops-ml-harvest__item-meta">
                        {formatDuration(clip.durationSec)} · {formatExportDate(clip.exportedAt)}
                      </span>
                    </div>
                    <div className="ops-ml-harvest__item-actions">
                      <button
                        type="button"
                        className="ops-ml-harvest__action"
                        title="Play"
                        onClick={() => setPlaying(clip)}
                      >
                        ▶
                      </button>
                      <button
                        type="button"
                        className="ops-ml-harvest__action"
                        title="Reveal in Finder"
                        disabled={busyPath === clip.exportedPath}
                        onClick={() => void revealInFinder(clip.exportedPath)}
                      >
                        📁
                      </button>
                      <button
                        type="button"
                        className="ops-ml-harvest__action"
                        title="View metadata"
                        onClick={() => setMetadata(clip)}
                      >
                        ℹ
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>

      {playing ? (
        <div className="ops-ml-harvest-modal" role="dialog" aria-modal="true">
          <div className="ops-ml-harvest-modal__backdrop" onClick={() => setPlaying(null)} />
          <div className="ops-ml-harvest-modal__card ops-ml-harvest-modal__card--wide">
            <h3 className="ops-ml-harvest-modal__title">{subjectFromTitle(playing.title)}</h3>
            <video
              className="ops-ml-harvest-modal__video"
              src={`/api/ops/media-lab/harvest-library/video?rel=${encodeURIComponent(playing.exportedPath)}`}
              controls
              autoPlay
            />
            <button type="button" className="ops-btn" onClick={() => setPlaying(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {metadata ? (
        <div className="ops-ml-harvest-modal" role="dialog" aria-modal="true">
          <div className="ops-ml-harvest-modal__backdrop" onClick={() => setMetadata(null)} />
          <div className="ops-ml-harvest-modal__card">
            <h3 className="ops-ml-harvest-modal__title">{subjectFromTitle(metadata.title)}</h3>
            <dl className="ops-ml-harvest-modal__meta">
              <div>
                <dt>Title</dt>
                <dd>{metadata.title}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{metadata.type}</dd>
              </div>
              <div>
                <dt>Source program</dt>
                <dd>{metadata.sourceProgram}</dd>
              </div>
              <div>
                <dt>Source file</dt>
                <dd className="ops-mono">{metadata.sourceFile}</dd>
              </div>
              <div>
                <dt>IN / OUT</dt>
                <dd>
                  {formatDuration(metadata.inSec)} → {formatDuration(metadata.outSec)}
                </dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd>{formatDuration(metadata.durationSec)}</dd>
              </div>
              <div>
                <dt>Exported</dt>
                <dd>{new Date(metadata.exportedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Path</dt>
                <dd className="ops-mono">{metadata.exportedPath}</dd>
              </div>
            </dl>
            <button type="button" className="ops-btn" onClick={() => setMetadata(null)}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
