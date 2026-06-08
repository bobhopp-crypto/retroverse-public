"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { ReviewStatsBar } from "@/components/ops/year-workspace/ReviewStatsBar";
import { ReviewVideoGrid } from "@/components/ops/year-workspace/ReviewVideoGrid";
import type { ActiveYearBridge } from "@/lib/ops/year-workspace/active-year-bridge";
import {
  DEFAULT_REVIEW_ROW_FILTER,
  type ReviewRowFilter,
} from "@/lib/ops/year-workspace/review-filters";
import { REVIEW_PILOT_ACTIVE_YEARS } from "@/lib/ops/year-workspace/review-pilot";
import { rotationSuggestsCocktail } from "@/lib/ops/year-workspace/vdj-rotation-signal";
import type { ReviewClassification } from "@/lib/ops/year-workspace/review-types";
import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";
import { REVIEW_UNIVERSE_1967_TAG_IDS } from "@/lib/ops/rvtags-review/vocabulary";
import type { YearWorkspaceData, YearWorkspaceRow } from "@/lib/ops/year-workspace/types";

type ApiPayload = {
  ok?: boolean;
  workspace?: YearWorkspaceData;
  reviewMode?: "video_universe" | "chart_workspace";
  bridges?: Record<string, ActiveYearBridge>;
  videoUniverseCount?: number;
  playCountRows?: number;
  needsReviewRows?: number;
  error?: string;
};

export function OpsYearWorkspace(props: { year: number }) {
  const [workspace, setWorkspace] = useState<YearWorkspaceData | null>(null);
  const [reviewMode, setReviewMode] = useState<"video_universe" | "chart_workspace">(
    "video_universe",
  );
  const [bridges, setBridges] = useState<Record<string, ActiveYearBridge>>({});
  const [videoCount, setVideoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewRowFilter>(DEFAULT_REVIEW_ROW_FILTER);

  const applyPayload = useCallback((data: ApiPayload) => {
    if (data.workspace) setWorkspace(data.workspace);
    if (data.reviewMode) setReviewMode(data.reviewMode);
    if (data.bridges) setBridges(data.bridges);
    if (data.videoUniverseCount != null) setVideoCount(data.videoUniverseCount);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/year-workspace?year=${props.year}`);
      const text = await res.text();
      let data: ApiPayload;
      try {
        data = JSON.parse(text) as ApiPayload;
      } catch {
        setError(res.ok ? "Invalid server response" : `Load failed (${res.status})`);
        return;
      }
      if (!res.ok || !data.ok || !data.workspace) {
        setError(data.error ?? `Load failed (${res.status})`);
        return;
      }
      applyPayload(data);
    } catch {
      setError("Failed to load review universe");
    } finally {
      setLoading(false);
    }
  }, [applyPayload, props.year]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchApi(body: Record<string, unknown>) {
    const res = await fetch("/api/ops/year-workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ year: props.year, ...body }),
    });
    const data = (await res.json()) as ApiPayload;
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Request failed");
    }
    applyPayload(data);
    return data;
  }

  async function saveTags(row: YearWorkspaceRow, tagId: RvTagId) {
    setBusyKeys((prev) => new Set(prev).add(row.workspaceKey));
    setNotice(null);
    try {
      const selected = new Set(row.historicalTags);
      if (selected.has(tagId)) selected.delete(tagId);
      else selected.add(tagId);
      const historicalTags = REVIEW_UNIVERSE_1967_TAG_IDS.filter((id) => selected.has(id));
      await patchApi({
        op: "setReview",
        workspaceKey: row.workspaceKey,
        historicalTags,
      });
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusyKeys((prev) => {
        const next = new Set(prev);
        next.delete(row.workspaceKey);
        return next;
      });
    }
  }

  async function saveClass(row: YearWorkspaceRow, classification: ReviewClassification) {
    setBusyKeys((prev) => new Set(prev).add(row.workspaceKey));
    setNotice(null);
    try {
      const patch: Record<string, unknown> = {
        op: "setReview",
        workspaceKey: row.workspaceKey,
        classification,
      };
      if (classification === "Fill" && rotationSuggestsCocktail(row.playCount)) {
        patch.classificationLocked = true;
      }
      await patchApi(patch);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusyKeys((prev) => {
        const next = new Set(prev);
        next.delete(row.workspaceKey);
        return next;
      });
    }
  }

  const reviewRows = workspace?.reviewRows ?? [];
  const isVideoUniverse = reviewMode === "video_universe";
  const fillCount = reviewRows.filter((r) => r.classification === "Fill").length;
  const cocktailCount = reviewRows.filter((r) => r.classification === "Cocktail").length;

  return (
    <div className="ops-yw ops-yw--review ops-yw--cards">
      <nav className="ops-ru-pilot-years" aria-label="Active years">
        {REVIEW_PILOT_ACTIVE_YEARS.map((y) => (
          <Link
            key={y}
            href={`/ops/year/${y}`}
            className={`ops-ru-pilot-years__link${y === props.year ? " ops-ru-pilot-years__link--on" : ""}`}
          >
            {y}
          </Link>
        ))}
      </nav>

      {isVideoUniverse && !loading ? (
        <ReviewStatsBar
          year={props.year}
          videoCount={videoCount || reviewRows.length}
          fillCount={fillCount}
          cocktailCount={cocktailCount}
        />
      ) : null}

      {notice ? (
        <p className="ops-notice" role="status">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <p className="ops-empty">Loading {props.year} videos…</p>
      ) : error ? (
        <p className="ops-empty">{error}</p>
      ) : workspace && isVideoUniverse ? (
        <ReviewVideoGrid
          rows={reviewRows}
          totalRows={reviewRows.length}
          bridges={bridges}
          busyKeys={busyKeys}
          filter={filter}
          onFilterChange={setFilter}
          onClassChange={(row, c) => void saveClass(row, c)}
          onTagToggle={(row, tagId) => void saveTags(row, tagId)}
        />
      ) : null}
    </div>
  );
}
