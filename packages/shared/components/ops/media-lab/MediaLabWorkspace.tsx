"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { OpsMediaLab } from "@/components/ops/OpsMediaLab";
import { OPS_FOCUS_YEAR } from "@/lib/ops/ops-focus-year";
import {
  buildMediaLabWorkspaceHref,
  type EpisodeBrowseView,
  type MediaLabLibrarySection,
} from "@/lib/ops/media-lab/workspace/urls";

import { HarvestLibraryPanel } from "./HarvestLibraryPanel";
import { MediaLabEpisodeDetail } from "./MediaLabEpisodeDetail";
import { MediaLabExportedDetail } from "./MediaLabExportedDetail";
import { MediaLabLibraryBrowse } from "./MediaLabLibraryBrowse";
import { MediaLabLibrarySidebar } from "./MediaLabLibrarySidebar";
import { MediaLabPerformanceEditor } from "./MediaLabPerformanceEditor";

function pushRecent(performanceId: string) {
  try {
    const raw = localStorage.getItem("media-lab-recent-performances");
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [performanceId, ...ids.filter((id) => id !== performanceId)].slice(0, 20);
    localStorage.setItem("media-lab-recent-performances", JSON.stringify(next));
  } catch {
    // ignore
  }
}

type Props = {
  defaultYear?: number;
};

export function MediaLabWorkspace({ defaultYear = OPS_FOCUS_YEAR }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const library = (searchParams.get("library") as MediaLabLibrarySection) || "imported";
  const collection = searchParams.get("collection") ?? "all";
  const episodeId = searchParams.get("episode") ?? undefined;
  const performanceId = searchParams.get("performance") ?? undefined;

  const episodeView = (searchParams.get("view") as EpisodeBrowseView) || "list";

  const filters = useMemo(
    () => ({
      q: searchParams.get("q") ?? "",
      year: searchParams.get("year") ?? "all",
      status: searchParams.get("status") ?? "all",
      classification: searchParams.get("classification") ?? "all",
    }),
    [searchParams],
  );

  const navigate = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next: Record<string, string> = {};
      const keys = [
        "library",
        "collection",
        "episode",
        "performance",
        "q",
        "year",
        "status",
        "classification",
        "view",
      ] as const;
      for (const k of keys) {
        const v =
          k in patch
            ? patch[k]
            : k === "library"
              ? library
              : k === "collection"
                ? collection
                : k === "view"
                  ? episodeView
                  : searchParams.get(k) ?? undefined;
        if (v && v !== "all" && !(k === "view" && v === "list")) next[k] = v;
      }
      router.push(buildMediaLabWorkspaceHref(next));
    },
    [collection, episodeView, library, router, searchParams],
  );

  const selectPerformance = useCallback(
    (epId: string, perfId: string) => {
      pushRecent(perfId);
      navigate({
        library,
        collection,
        episode: epId,
        performance: perfId,
        view: library === "episodes" ? episodeView : undefined,
      });
    },
    [collection, episodeView, library, navigate],
  );

  const selectEpisode = useCallback(
    (epId: string) => {
      navigate({
        library: "episodes",
        collection,
        episode: epId,
        performance: undefined,
        view: episodeView,
      });
    },
    [collection, episodeView, navigate],
  );

  const showEditor = Boolean(episodeId && performanceId && library !== "exported");
  const showExportedDetail = Boolean(performanceId && library === "exported");
  const showEpisodeOnly = Boolean(episodeId && !performanceId && library === "episodes");
  const showImport = library === "imported" && !showEditor;
  const showHarvest = library === "harvest";

  return (
    <div className="ml-workspace">
      <MediaLabLibrarySidebar
        library={library}
        collection={collection}
        onLibraryChange={(section) =>
          navigate({
            library: section,
            episode: undefined,
            performance: undefined,
          })
        }
        onCollectionChange={(col) =>
          navigate({ collection: col, episode: undefined, performance: undefined })
        }
      >
        <MediaLabLibraryBrowse
          library={library}
          collection={collection}
          episodeView={episodeView}
          selectedEpisodeId={episodeId}
          selectedPerformanceId={performanceId}
          filters={filters}
          onFiltersChange={(patch) => navigate(patch)}
          onSelectEpisode={selectEpisode}
          onSelectPerformance={selectPerformance}
        />
      </MediaLabLibrarySidebar>

      <div className="ml-workspace__main">
        {showEditor ? (
          <MediaLabPerformanceEditor
            episodeId={episodeId!}
            performanceId={performanceId!}
            onSelectSibling={selectPerformance}
          />
        ) : null}

        {showExportedDetail ? (
          <MediaLabExportedDetail
            performanceId={performanceId!}
            onOpenSource={(ep, perf) =>
              navigate({ library: "performances", episode: ep, performance: perf })
            }
          />
        ) : null}

        {showEpisodeOnly ? (
          <MediaLabEpisodeDetail
            episodeId={episodeId!}
            collection={collection}
            selectedPerformanceId={performanceId}
            onSelectPerformance={(perf) => selectPerformance(episodeId!, perf)}
          />
        ) : null}

        {showHarvest ? (
          <div className="ml-workspace__harvest-panel">
            <h2 className="ml-workspace__main-title">Harvest Queue</h2>
            <HarvestLibraryPanel />
          </div>
        ) : null}

        {showImport ? <OpsMediaLab defaultYear={defaultYear} /> : null}

        {!showEditor && !showExportedDetail && !showEpisodeOnly && !showHarvest && !showImport ? (
          <div className="ml-workspace__placeholder">
            <h2 className="ml-workspace__main-title">Media Lab</h2>
            <p className="ops-dim">
              Select a performance from the library sidebar to edit, or choose <strong>Imported Videos</strong> to
              transcribe and analyze.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
