"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { displayCanonicalFile } from "@/lib/ops/allstar/canonical-display";
import { trustLabel, trustTone } from "@/lib/ops/allstar/confidence";
import type { ReviewPriorityEntry } from "@/lib/ops/allstar/review-priority";
import type { AllStarDisc } from "@/lib/ops/allstar/types";
import type { ReviewItem } from "@/lib/ops/allstar/review-state";

type ReviewPayload = {
  total: number;
  reviewed: number;
  pending: number;
  next: AllStarDisc | null;
  nextPriority: ReviewPriorityEntry | null;
  reviewState: { items: Record<string, ReviewItem> };
};

export function AllStarReviewPanel() {
  const [payload, setPayload] = useState<ReviewPayload | null>(null);
  const [current, setCurrent] = useState<AllStarDisc | null>(null);
  const [priority, setPriority] = useState<ReviewPriorityEntry | null>(null);
  const [review, setReview] = useState<ReviewItem | null>(null);
  const [busy, setBusy] = useState(false);

  const loadDisc = useCallback(async (discId?: string) => {
    const url = discId
      ? `/api/ops/allstar/review?discId=${encodeURIComponent(discId)}`
      : "/api/ops/allstar/review";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as ReviewPayload & {
      disc?: AllStarDisc;
      review?: ReviewItem;
      priority?: ReviewPriorityEntry;
    };
    if (discId && data.disc) {
      setCurrent(data.disc);
      setReview(data.review ?? null);
      setPriority(data.priority ?? null);
      return;
    }
    setPayload(data);
    if (data.next) {
      setCurrent(data.next);
      setPriority(data.nextPriority ?? null);
      setReview(data.reviewState.items[data.next.id] ?? null);
    } else {
      setCurrent(null);
      setPriority(null);
    }
  }, []);

  useEffect(() => {
    void loadDisc();
  }, [loadDisc]);

  async function submit(action: "accepted" | "correct" | "skipped") {
    if (!current || busy) return;
    setBusy(true);
    try {
      await fetch("/api/ops/allstar/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discId: current.id, action }),
      });
      await loadDisc();
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current || busy) return;
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        void submit("accepted");
      }
      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        void submit("correct");
      }
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        void submit("skipped");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, busy]);

  if (!payload && !current) {
    return <p className="ops-allstar__empty">Loading smart review queue…</p>;
  }

  const scanUrl = current
    ? `/api/ops/allstar/image?kind=scan&id=${encodeURIComponent(current.id)}`
    : null;
  const reviewUrl = current
    ? `/api/ops/allstar/image?kind=review&id=${encodeURIComponent(current.id)}`
    : null;

  const trust = priority?.trustLevel;

  return (
    <div className="ops-allstar__intel">
      <section className="ops-allstar__archive-panel ops-allstar__archive-panel--wide">
        <div className="ops-allstar__archive-panel-head">
          <h2>Smart Review Queue</h2>
          <span>
            {payload?.reviewed ?? 0} / {payload?.total ?? 0} reviewed · {payload?.pending ?? 0} prioritized
          </span>
        </div>
        <p className="ops-allstar__comparison-lead">
          Priority: OCR failures → low confidence → duplicates → missing intelligence. Trusted discs deprioritized.
          Keyboard: <kbd>A</kbd> Accept · <kbd>C</kbd> Correct · <kbd>S</kbd> Skip
        </p>
      </section>

      {!current ? (
        <p className="ops-allstar__empty">No discs need review right now.</p>
      ) : (
        <>
          <div className="ops-allstar__review-head">
            <div>
              <h3>{current.player || current.id}</h3>
              <p>{current.position || "Position pending"}</p>
              <p className="ops-allstar__player-canonical">
                <code>{displayCanonicalFile(current)}</code>
              </p>
              {trust ? (
                <span className={`ops-allstar__trust ops-allstar__trust--${trustTone(trust)}`}>
                  {trustLabel(trust)} · archive conf. {priority?.archiveConfidence ?? "—"}
                </span>
              ) : null}
              {priority?.reasons.length ? (
                <ul className="ops-allstar__findings">
                  {priority.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : null}
              {review?.status && review.status !== "pending" ? (
                <p className="ops-allstar__review-status">Last: {review.status}</p>
              ) : null}
            </div>
            <div className="ops-allstar__preserve-actions">
              <button type="button" disabled={busy} onClick={() => void submit("accepted")}>
                Accept (A)
              </button>
              <button type="button" disabled={busy} onClick={() => void submit("correct")}>
                Correct (C)
              </button>
              <button type="button" disabled={busy} onClick={() => void submit("skipped")}>
                Skip (S)
              </button>
              <Link href={`/ops/allstar/analysis/${current.id}`}>Full analysis</Link>
            </div>
          </div>

          <div className="ops-allstar__review-grid">
            <figure>
              <figcaption>Original scan</figcaption>
              {scanUrl ? <img src={scanUrl} alt="" /> : null}
            </figure>
            <figure>
              <figcaption>Review image</figcaption>
              {reviewUrl ? <img src={reviewUrl} alt="" /> : null}
            </figure>
          </div>

          <section className="ops-allstar__archive-panel">
            <h3>OCR / Wedge Summary</h3>
            <p>
              Geometry: {current.geometryStatus} · Status: {current.processingStatus} · Wedges labeled:{" "}
              {current.labeledWedgeCount ?? "—"}
            </p>
            {current.warnings.length ? (
              <ul className="ops-allstar__findings">
                {current.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
