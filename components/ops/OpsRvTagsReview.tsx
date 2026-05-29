"use client";

import { useCallback, useEffect, useState } from "react";

import { OpsRvTagsVideoPreview } from "@/components/ops/OpsRvTagsVideoPreview";
import type { RvTagsReviewItem } from "@/lib/ops/rvtags-review/load-queue";
import {
  CROWD_FIXED_SLOTS,
  CROWD_MORE_TAG_IDS,
  moreTagsActive,
  rvTagLabel,
  STYLE_FIXED_SLOTS,
  STYLE_MORE_TAG_IDS,
  type FixedTagSlot,
} from "@/lib/ops/rvtags-review/fixed-layout";
import type { RvTagDef, RvTagId } from "@/lib/ops/rvtags-review/vocabulary";

type QueueResponse = {
  ok?: boolean;
  items?: RvTagsReviewItem[];
  reviewedCount?: number;
  total?: number;
  vocabulary?: RvTagDef[];
  error?: string;
};

type MorePanel = "style" | "crowd" | null;

function FixedTagPanel(props: {
  name: string;
  variant: "style" | "crowd";
  slots: FixedTagSlot[];
  moreTagIds: RvTagId[];
  draft: RvTagId[];
  moreOpen: boolean;
  onToggle: (id: RvTagId) => void;
  onMoreOpen: () => void;
  onMoreClose: () => void;
}) {
  const moreActive = moreTagsActive(props.draft, props.moreTagIds);

  return (
    <section
      className={`ops-rvreview__panel ops-rvreview__panel--${props.variant}`}
    >
      <h3 className="ops-rvreview__panel-name">{props.name}</h3>
      <div className="ops-rvreview__btns">
        {props.slots.map((slot) => {
          if (slot.kind === "more") {
            const on = moreActive;
            return (
              <button
                key={`more-${props.variant}`}
                type="button"
                className={`ops-rvreview__btn ops-rvreview__btn--more${
                  on ? " ops-rvreview__btn--on" : ""
                }${props.moreOpen ? " ops-rvreview__btn--more-open" : ""}`}
                onClick={props.onMoreOpen}
                aria-expanded={props.moreOpen}
                aria-haspopup="listbox"
              >
                More…
              </button>
            );
          }
          const on = props.draft.includes(slot.id);
          return (
            <button
              key={slot.id}
              type="button"
              className={`ops-rvreview__btn${on ? " ops-rvreview__btn--on" : ""}`}
              onClick={() => props.onToggle(slot.id)}
              aria-pressed={on}
            >
              {rvTagLabel(slot.id)}
            </button>
          );
        })}
      </div>
      {props.moreOpen ? (
        <div
          className="ops-rvreview__more"
          role="listbox"
          aria-label={`${props.name} extra tags`}
        >
          {props.moreTagIds.length === 0 ? (
            <p className="ops-rvreview__more-empty">No extra tags</p>
          ) : (
            props.moreTagIds.map((id) => {
              const on = props.draft.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`ops-rvreview__more-btn${
                    on ? " ops-rvreview__more-btn--on" : ""
                  }`}
                  onClick={() => props.onToggle(id)}
                >
                  {rvTagLabel(id)}
                </button>
              );
            })
          )}
          <button
            type="button"
            className="ops-rvreview__more-done"
            onClick={props.onMoreClose}
          >
            Done
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function OpsRvTagsReview(props: { year: number }) {
  const [items, setItems] = useState<RvTagsReviewItem[]>([]);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<RvTagId[]>([]);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [morePanel, setMorePanel] = useState<MorePanel>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/rvtags-review?year=${props.year}`);
      const data = (await res.json()) as QueueResponse;
      if (!res.ok || !data.ok || !data.items) {
        setError(data.error ?? `Load failed (${res.status})`);
        return;
      }
      setItems(data.items);
      setReviewedCount(data.reviewedCount ?? 0);

      const firstOpen =
        data.items.findIndex((i) => !i.reviewed) >= 0
          ? data.items.findIndex((i) => !i.reviewed)
          : 0;
      setIndex(firstOpen);
      setDraft(data.items[firstOpen]?.selectedTags ?? []);
    } catch {
      setError("Failed to load review queue");
    } finally {
      setLoading(false);
    }
  }, [props.year]);

  useEffect(() => {
    void load();
  }, [load]);

  const item = items[index] ?? null;
  const total = items.length;

  useEffect(() => {
    if (!item) return;
    setDraft(item.selectedTags);
    setNotice(null);
    setPreviewOpen(false);
    setMorePanel(null);
  }, [item?.filePath]);

  const progressPct = total > 0 ? Math.round((reviewedCount / total) * 100) : 0;

  const toggleTag = (id: RvTagId) => {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const goTo = (next: number) => {
    if (next < 0 || next >= total) return;
    const target = items[next];
    if (!target) return;
    setIndex(next);
    setDraft(target.selectedTags);
  };

  const saveAndNext = async () => {
    if (!item || saving) return;
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/ops/rvtags-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: props.year,
          filePath: item.filePath,
          tags: draft,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        reviewedCount?: number;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? `Save failed (${res.status})`);
        return;
      }

      const now = new Date().toISOString();
      const nextItems = items.map((row, i) =>
        i === index
          ? {
              ...row,
              selectedTags: draft,
              reviewed: true,
              reviewedAt: now,
            }
          : row,
      );
      setItems(nextItems);
      setReviewedCount(data.reviewedCount ?? reviewedCount + 1);
      setNotice("Saved");

      let nextIdx = nextItems.findIndex((row, i) => i > index && !row.reviewed);
      if (nextIdx < 0) nextIdx = nextItems.findIndex((row) => !row.reviewed);
      if (nextIdx < 0 && index < total - 1) nextIdx = index + 1;
      if (nextIdx >= 0) {
        setIndex(nextIdx);
        setDraft(nextItems[nextIdx]!.selectedTags);
      }
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const playsLabel =
    item?.playCount != null && Number.isFinite(item.playCount)
      ? String(item.playCount)
      : "—";

  if (loading) {
    return <p className="ops-rvreview__loading">Loading…</p>;
  }

  if (error && items.length === 0) {
    return (
      <p className="ops-rvreview__error" role="alert">
        {error}
      </p>
    );
  }

  if (!item) {
    return <p className="ops-dim">No tracks in queue.</p>;
  }

  return (
    <div className="ops-rvreview">
      <div className="ops-rvreview__progress" aria-label="Review progress">
        <span className="ops-rvreview__progress-text">
          {reviewedCount} / {total} reviewed
        </span>
        <div className="ops-rvreview__progress-bar" aria-hidden>
          <div
            className="ops-rvreview__progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="ops-rvreview__hero-slot">
        {previewOpen ? (
          <OpsRvTagsVideoPreview
            filePath={item.filePath}
            title={item.title || "Untitled"}
            artist={item.artist || "Unknown artist"}
            onClose={() => setPreviewOpen(false)}
          />
        ) : (
          <button
            type="button"
            className="ops-rvreview__song"
            onClick={() => setPreviewOpen(true)}
            aria-label={`Preview ${item.title || "track"}`}
          >
            <h2 className="ops-rvreview__song-title">
              {item.title || "Untitled"}
            </h2>
            <div className="ops-rvreview__song-row">
              <span className="ops-rvreview__song-artist">
                {item.artist || "Unknown artist"}
              </span>
              <span className="ops-rvreview__song-plays">Plays {playsLabel}</span>
            </div>
            <span className="ops-rvreview__song-hint">Tap for preview</span>
          </button>
        )}
      </div>

      <FixedTagPanel
        name="Style"
        variant="style"
        slots={STYLE_FIXED_SLOTS}
        moreTagIds={STYLE_MORE_TAG_IDS}
        draft={draft}
        moreOpen={morePanel === "style"}
        onToggle={toggleTag}
        onMoreOpen={() =>
          setMorePanel((p) => (p === "style" ? null : "style"))
        }
        onMoreClose={() => setMorePanel(null)}
      />

      <FixedTagPanel
        name="Crowd"
        variant="crowd"
        slots={CROWD_FIXED_SLOTS}
        moreTagIds={CROWD_MORE_TAG_IDS}
        draft={draft}
        moreOpen={morePanel === "crowd"}
        onToggle={toggleTag}
        onMoreOpen={() =>
          setMorePanel((p) => (p === "crowd" ? null : "crowd"))
        }
        onMoreClose={() => setMorePanel(null)}
      />

      {error ? (
        <p className="ops-rvreview__error" role="alert">
          {error}
        </p>
      ) : null}

      <nav className="ops-rvreview__nav" aria-label="Review navigation">
        {notice ? (
          <span className="ops-rvreview__saved" aria-live="polite">
            {notice}
          </span>
        ) : (
          <span className="ops-rvreview__saved" aria-hidden />
        )}
        <button
          type="button"
          className="ops-rvreview__nav-btn"
          disabled={index <= 0 || saving}
          onClick={() => goTo(index - 1)}
        >
          Previous
        </button>
        <button
          type="button"
          className="ops-rvreview__nav-btn ops-rvreview__nav-btn--primary"
          disabled={saving}
          onClick={() => void saveAndNext()}
        >
          {saving ? "Saving…" : "Save & Next"}
        </button>
      </nav>
    </div>
  );
}
