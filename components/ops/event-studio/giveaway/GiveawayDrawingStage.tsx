"use client";

import { useState } from "react";

import type { Giveaway, GiveawayDrawRecord, GiveawayDrawStatus, GiveawayEntry } from "@/lib/ops/event-studio/giveaway/types";

type Props = {
  giveaway: Giveaway;
  eligibleCount: number;
  currentDraw: GiveawayDrawRecord | null;
  currentWinner: GiveawayEntry | null;
};

export function GiveawayDrawingStage({
  giveaway,
  eligibleCount,
  currentDraw,
  currentWinner,
}: Props) {
  const [draw, setDraw] = useState(currentDraw);
  const [winner, setWinner] = useState(currentWinner);
  const [eligible, setEligible] = useState(eligibleCount);
  const [animating, setAnimating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function drawWinner() {
    setBusy(true);
    setAnimating(true);
    setMessage(null);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      const res = await fetch("/api/ops/event-studio/giveaway/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ giveawayId: giveaway.id }),
      });
      const data = (await res.json()) as {
        draw?: GiveawayDrawRecord;
        winner?: GiveawayEntry;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Draw failed");
      setDraw(data.draw ?? null);
      setWinner(data.winner ?? null);
      setEligible((count) => Math.max(0, count - 1));
      setMessage("Winner drawn.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Draw failed");
    } finally {
      setAnimating(false);
      setBusy(false);
    }
  }

  async function updateStatus(status: GiveawayDrawStatus) {
    if (!draw) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/ops/event-studio/giveaway/draw/${encodeURIComponent(draw.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { draw?: GiveawayDrawRecord; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      setDraw(data.draw ?? null);
      if (status === "redrawn" || status === "disqualified" || status === "not_present") {
        setWinner(null);
        setDraw(null);
      }
      setMessage(`Marked ${status.replace("_", " ")}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`es-giveaway-drawing${animating ? " es-giveaway-drawing--animating" : ""}`}>
      <section className="es-giveaway-draw-stage" aria-label="Drawing stage">
        <p className="es-giveaway-draw-kicker">Live drawing</p>
        <h2>{giveaway.prize.title}</h2>
        <p className="es-giveaway-draw-meta">{eligible} eligible entries</p>

        {!winner ? (
          <button
            type="button"
            className="es-giveaway-draw-btn"
            disabled={busy || eligible === 0}
            onClick={() => void drawWinner()}
          >
            {busy ? "Drawing…" : "Draw Winner"}
          </button>
        ) : (
          <article className="es-giveaway-winner-card">
            <p className="es-giveaway-winner-card__label">Winner</p>
            <h3>
              {winner.firstName} {winner.lastName}
            </h3>
            <p>{[winner.email, winner.phone].filter(Boolean).join(" · ") || "No contact on file"}</p>
            <div className="es-giveaway-winner-actions">
              <button type="button" className="es-giveaway-btn" disabled={busy} onClick={() => void updateStatus("claimed")}>
                Claim
              </button>
              <button type="button" className="es-giveaway-btn" disabled={busy} onClick={() => void updateStatus("not_present")}>
                Not Present
              </button>
              <button type="button" className="es-giveaway-btn" disabled={busy} onClick={() => void updateStatus("redrawn")}>
                Redraw
              </button>
              <button type="button" className="es-giveaway-btn" disabled={busy} onClick={() => void updateStatus("disqualified")}>
                Disqualify
              </button>
              <button
                type="button"
                className="es-giveaway-btn es-giveaway-btn--primary"
                disabled={busy}
                onClick={() => void updateStatus("completed")}
              >
                Complete
              </button>
            </div>
          </article>
        )}

        {message ? <p className="es-giveaway-form__message">{message}</p> : null}
      </section>
    </div>
  );
}
