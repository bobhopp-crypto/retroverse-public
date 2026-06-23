"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { RetroverseMapCard, RetroverseMapDecision } from "@/lib/ops/retroverse-map-store";

type Props = {
  initialCards: RetroverseMapCard[];
};

type Filter = "all" | RetroverseMapDecision;

const filterLabels: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "keep", label: "Keep" },
  { value: "unsure", label: "Not Sure" },
  { value: "remove", label: "Remove" },
];

const decisionLabels: Array<{ value: RetroverseMapDecision; label: string }> = [
  { value: "keep", label: "Keep" },
  { value: "unsure", label: "Not Sure" },
  { value: "remove", label: "Remove" },
];

export function RetroverseMapBoard({ initialCards }: Props) {
  const [cards, setCards] = useState(initialCards);
  const [filter, setFilter] = useState<Filter>("all");
  const [message, setMessage] = useState<string>("Saved locally.");
  const [saving, setSaving] = useState(false);

  const visibleCards = useMemo(() => {
    if (filter === "all") return cards;
    return cards.filter((card) => card.decision === filter);
  }, [cards, filter]);

  async function save(nextCards: RetroverseMapCard[]) {
    setCards(nextCards);
    setSaving(true);
    setMessage("Saving...");
    try {
      const res = await fetch("/api/ops/map", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards: nextCards }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      setMessage(res.ok && data.ok ? "Saved locally." : data.error ?? "Save failed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  function updateCard(id: string, patch: Partial<RetroverseMapCard>) {
    const nextCards = cards.map((card) => (card.id === id ? { ...card, ...patch } : card));
    void save(nextCards);
  }

  return (
    <div className="ops-map">
      <header className="ops-map__head">
        <div>
          <p className="ops-command__kicker">Manual page board</p>
          <h1 className="ops-command__title">Retroverse Map</h1>
          <p className="ops-command__lead">
            Review Retroverse one page at a time. Mark what to keep, question, or remove later.
          </p>
        </div>
        <Link className="ops-map__back" href="/ops">
          Command Center
        </Link>
      </header>

      <div className="ops-map__toolbar">
        <div className="ops-map__filters" aria-label="Decision filters">
          {filterLabels.map((item) => (
            <button
              key={item.value}
              type="button"
              className={filter === item.value ? "ops-map__filter ops-map__filter--active" : "ops-map__filter"}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="ops-map__save" aria-live="polite">
          {saving ? "Saving..." : message}
        </p>
      </div>

      <section className="ops-map__grid" aria-label="Retroverse pages">
        {visibleCards.map((card) => (
          <article key={card.id} className={`ops-map__card ops-map__card--${card.decision}`}>
            <div className="ops-map__card-head">
              <div>
                <h2>{card.title}</h2>
                <Link href={card.route}>{card.route}</Link>
              </div>
              <label>
                <span>Decision</span>
                <select
                  value={card.decision}
                  onChange={(event) =>
                    updateCard(card.id, { decision: event.target.value as RetroverseMapDecision })
                  }
                >
                  {decisionLabels.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="ops-map__notes">
              <span>Notes</span>
              <textarea
                value={card.notes}
                rows={4}
                placeholder="Add a note..."
                onChange={(event) => updateCard(card.id, { notes: event.target.value })}
              />
            </label>
          </article>
        ))}
      </section>
    </div>
  );
}
