"use client";

import { useState } from "react";

type Props = {
  years: number[];
  onChange: (years: number[]) => void;
};

export function FeaturedYearsRail({ years, onChange }: Props) {
  const [draft, setDraft] = useState("");

  function removeYear(y: number) {
    onChange(years.filter((row) => row !== y));
  }

  function moveYear(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= years.length) return;
    const copy = [...years];
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    onChange(copy);
  }

  function commitAdd() {
    const y = Number.parseInt(draft.trim(), 10);
    if (!Number.isFinite(y) || y < 1900 || y > 2100 || years.includes(y)) {
      setDraft("");
      return;
    }
    onChange([...years, y]);
    setDraft("");
  }

  return (
    <section className="cc-years" aria-label="Featured years">
      <h2 className="cc-years__title">Featured Years</h2>

      <div className="cc-years__stack">
        {years.map((y, index) => (
          <div key={y} className="cc-years__row" role="listitem">
            <span className="cc-years__pill">{y}</span>
            <button
              type="button"
              className="cc-years__ctrl"
              disabled={index === 0}
              aria-label={`Move ${y} up`}
              title="Move earlier"
              onClick={() => moveYear(index, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="cc-years__ctrl"
              disabled={index === years.length - 1}
              aria-label={`Move ${y} down`}
              title="Move later"
              onClick={() => moveYear(index, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              className="cc-years__ctrl cc-years__ctrl--remove"
              aria-label={`Remove ${y}`}
              title="Remove year"
              onClick={() => removeYear(y)}
            >
              ×
            </button>
          </div>
        ))}

        <div className="cc-years__add-row">
          <button
            type="button"
            className="cc-years__add-btn"
            onClick={() => {
              const input = document.getElementById("cc-years-add-input") as HTMLInputElement | null;
              input?.focus();
            }}
          >
            + Add Year
          </button>
          <input
            id="cc-years-add-input"
            className="cc-years__add-input"
            type="text"
            inputMode="numeric"
            placeholder="e.g. 1992"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitAdd();
              }
            }}
            onBlur={() => {
              if (draft.trim()) commitAdd();
            }}
          />
        </div>
      </div>
    </section>
  );
}
