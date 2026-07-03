"use client";

import { useState } from "react";

import type { Giveaway, GiveawayPrize } from "@/lib/ops/event-studio/giveaway/types";

type Props = {
  giveaway: Giveaway;
};

export function GiveawayPrizeEditor({ giveaway }: Props) {
  const [prize, setPrize] = useState<GiveawayPrize>(giveaway.prize);
  const [galleryInput, setGalleryInput] = useState(giveaway.prize.galleryImageUrls.join("\n"));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const galleryImageUrls = galleryInput
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const res = await fetch("/api/ops/event-studio/giveaway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-prize",
          payload: { giveawayId: giveaway.id, prize: { ...prize, galleryImageUrls } },
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setMessage("Prize saved.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="es-giveaway-prize">
      <section className="es-giveaway-hero" aria-label="Prize preview">
        <div className="es-giveaway-hero__media">
          {prize.heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={prize.heroImageUrl} alt={prize.title} />
          ) : (
            <div className="es-giveaway-hero__placeholder">
              <span>Hero photo</span>
            </div>
          )}
        </div>
        <div className="es-giveaway-hero__copy">
          <p className="es-giveaway-hero__eyebrow">Prize preview</p>
          <h3>{prize.title || "Untitled prize"}</h3>
          <p>{prize.description}</p>
        </div>
      </section>

      <section className="ops-event-studio__panel es-giveaway-form" aria-label="Prize details">
        <h2 className="ops-event-studio__panel-title">Prize Details</h2>
        <label>
          Title
          <input value={prize.title} onChange={(e) => setPrize({ ...prize, title: e.target.value })} />
        </label>
        <label>
          Description
          <textarea
            rows={4}
            value={prize.description}
            onChange={(e) => setPrize({ ...prize, description: e.target.value })}
          />
        </label>
        <label>
          Retail value
          <input
            value={prize.retailValue}
            onChange={(e) => setPrize({ ...prize, retailValue: e.target.value })}
            placeholder="$2,000 · $25 gift card"
          />
        </label>
        <label>
          Sponsor
          <input value={prize.sponsor} onChange={(e) => setPrize({ ...prize, sponsor: e.target.value })} />
        </label>
        <label>
          Hero image URL
          <input
            value={prize.heroImageUrl ?? ""}
            onChange={(e) => setPrize({ ...prize, heroImageUrl: e.target.value.trim() || null })}
            placeholder="https://..."
          />
        </label>
        <label>
          Gallery URLs (one per line)
          <textarea rows={4} value={galleryInput} onChange={(e) => setGalleryInput(e.target.value)} />
        </label>
        <label>
          Notes
          <textarea rows={3} value={prize.notes} onChange={(e) => setPrize({ ...prize, notes: e.target.value })} />
        </label>
        <label>
          Promotional copy
          <textarea
            rows={4}
            value={prize.promoCopy}
            onChange={(e) => setPrize({ ...prize, promoCopy: e.target.value })}
          />
        </label>
        <div className="es-giveaway-form__actions">
          <button type="button" className="es-giveaway-btn es-giveaway-btn--primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save Prize"}
          </button>
          {message ? <p className="es-giveaway-form__message">{message}</p> : null}
        </div>
      </section>
    </div>
  );
}
