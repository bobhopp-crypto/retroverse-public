"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import type { PipelineStage, PipelineStageResult } from "@/lib/bobos/pipeline/load-pipeline-stage";
import type { HomepageRvtrMode, HomepageRvtrResolution } from "@/lib/home/homepage-rvtr";
import type { SearchEntity } from "@/lib/search/search-entity-types";
import { normalizeRvtr } from "@/lib/studio/status";
import { BobosPageHeader } from "@/components/bobos/BobosPageHeader";
import { HumaneDocument } from "@/components/shared/HumaneDocument";

import { ExplorerSearch, type ExplorerSelection } from "./ExplorerSearch";

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: "collector", label: "Collector" },
  { id: "editor", label: "Editor" },
  { id: "director", label: "Director" },
  { id: "publisher", label: "Publisher" },
];

const LIVE_POLL_MS = 3000;

type SundayNightsCurrent = {
  currentTrackId: string | null;
  live: { source?: string | null } | null;
  channel: { running?: boolean } | null;
};

type Props = {
  stage: PipelineStage;
  resolution: HomepageRvtrResolution | null;
  pipelineResult: PipelineStageResult | null;
  entity: SearchEntity | null;
  rotationRvtr: string | null;
  manualSelection: boolean;
};

function modeLabel(mode: HomepageRvtrMode, liveBroadcast: boolean): string {
  if (liveBroadcast) return "Live";
  if (mode === "manual") return "Selected";
  return "Rotation";
}

function buildExplorerUrl(input: {
  stage: PipelineStage;
  rvtr?: string | null;
  rval?: string | null;
  rvar?: string | null;
  artist?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set("stage", input.stage);
  if (input.rvtr) params.set("rvtr", input.rvtr);
  if (input.rval) params.set("rval", input.rval);
  if (input.rvar) params.set("rvar", input.rvar);
  if (input.artist) params.set("artist", input.artist);
  const query = params.toString();
  return query ? `/bobos/pipeline?${query}` : "/bobos/pipeline";
}

export function RetroverseExplorerView({
  stage,
  resolution,
  pipelineResult,
  entity,
  rotationRvtr,
  manualSelection,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manualSelectionRef = useRef(manualSelection);

  useEffect(() => {
    manualSelectionRef.current = manualSelection;
  }, [manualSelection]);

  const handleSelect = useCallback(
    (selection: ExplorerSelection) => {
      if (selection.kind === "song") {
        router.push(buildExplorerUrl({ stage, rvtr: selection.rvtr }));
        return;
      }
      if (selection.kind === "album") {
        router.push(buildExplorerUrl({ stage, rval: selection.rval }));
        return;
      }
      router.push(
        buildExplorerUrl({
          stage,
          rvar: selection.rvar,
          artist: selection.rvar ? undefined : selection.artist,
        }),
      );
    },
    [router, stage],
  );

  const handleStageChange = useCallback(
    (nextStage: PipelineStage) => {
      router.push(
        buildExplorerUrl({
          stage: nextStage,
          rvtr: searchParams.get("rvtr"),
          rval: searchParams.get("rval"),
          rvar: searchParams.get("rvar"),
          artist: searchParams.get("artist"),
        }),
      );
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (manualSelection) return;

    let cancelled = false;

    async function pollLive() {
      try {
        const response = await fetch("/api/sunday-nights/current", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as SundayNightsCurrent;

        const liveBroadcast =
          payload.live?.source === "bridge" && Boolean(payload.currentTrackId?.trim());
        const liveRvtr = normalizeRvtr(payload.currentTrackId);

        if (liveBroadcast && liveRvtr) {
          const current = searchParams.get("rvtr");
          if (current !== liveRvtr) {
            router.replace(buildExplorerUrl({ stage, rvtr: liveRvtr }));
          }
          return;
        }

        if (payload.channel?.running && liveRvtr) {
          const current = searchParams.get("rvtr");
          if (current !== liveRvtr) {
            router.replace(buildExplorerUrl({ stage, rvtr: liveRvtr }));
          }
        }
      } catch {
        // ignore transient poll errors
      }
    }

    const timer = window.setInterval(pollLive, LIVE_POLL_MS);
    void pollLive();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [manualSelection, router, searchParams, stage]);

  const activeLabel = pipelineResult?.songLabel
    ? `${pipelineResult.songLabel.artist} — ${pipelineResult.songLabel.title}`
    : entity
      ? entity.entityType === "album" && entity.artist
        ? `${entity.label} · ${entity.artist}`
        : entity.label
      : rotationRvtr
        ? rotationRvtr
        : null;

  const activeId =
    pipelineResult?.rvtr ??
    entity?.rvId ??
    (entity?.entityType === "artist" ? searchParams.get("rvar") : null) ??
    rotationRvtr;

  const renderData = pipelineResult?.wired
    ? pipelineResult.data
    : entity
      ? entity
      : null;

  const liveLocked = resolution?.liveBroadcast ?? false;

  return (
    <div className="bobos-page rv-explorer">
      <BobosPageHeader
        page="Retroverse Explorer"
        subtitle="Search the canonical music graph and follow a song through the pipeline stages."
      />

      <ExplorerSearch onSelect={handleSelect} disabled={liveLocked} />

      {activeLabel ? (
        <p className="rv-explorer__active">
          {activeLabel}
          {activeId ? <span className="rv-explorer__active-id">{activeId}</span> : null}
        </p>
      ) : null}

      {!manualSelection && resolution ? (
        <p className="rv-explorer__mode" aria-live="polite">
          {modeLabel(resolution.mode, resolution.liveBroadcast)}
          {resolution.rvtr ? ` · ${resolution.rvtr}` : ""}
        </p>
      ) : null}

      <nav className="rv-explorer__stages" aria-label="Pipeline stages">
        {STAGES.map(({ id, label }) => {
          const active = stage === id;
          return (
            <button
              key={id}
              type="button"
              className={`rv-explorer__stage${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => handleStageChange(id)}
            >
              {label}
            </button>
          );
        })}
      </nav>

      <div className="rv-explorer__divider" aria-hidden />

      <section className="rv-explorer__render">
        {entity && !pipelineResult ? (
          <p className="rv-explorer__render-note">
            Pipeline stages apply to songs (RVTR). Showing graph entity record.
          </p>
        ) : null}

        {renderData ? (
          <HumaneDocument value={renderData} />
        ) : pipelineResult && !pipelineResult.wired ? (
          <p className="rv-explorer__empty">Loader not wired yet.</p>
        ) : (
          <p className="rv-explorer__empty">Search for a song, artist, or album — or wait for rotation.</p>
        )}
      </section>

      <div className="rv-explorer__divider" aria-hidden />
    </div>
  );
}
