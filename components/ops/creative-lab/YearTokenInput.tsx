"use client";

import { useState } from "react";

type Props = {
  years: number[];
  onChange: (years: number[]) => void;
};

export function YearTokenInput(props: Props) {
  const { years, onChange } = props;
  const [draft, setDraft] = useState("");

  function addYear(raw: string) {
    const y = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(y) || y < 1900 || y > 2100) return;
    if (years.includes(y)) return;
    onChange([...years, y].sort((a, b) => a - b));
    setDraft("");
  }

  function removeYear(y: number) {
    onChange(years.filter((row) => row !== y));
  }

  return (
    <div className="cl-year-tokens">
      <div className="cl-year-tokens__chips" role="list" aria-label="Featured years">
        {years.map((y) => (
          <span key={y} className="cl-year-tokens__chip" role="listitem">
            {y}
            <button type="button" className="cl-year-tokens__remove" aria-label={`Remove ${y}`} onClick={() => removeYear(y)}>
              ×
            </button>
          </span>
        ))}
        <label className="cl-year-tokens__add">
          <span className="cl-year-tokens__add-label">Add Year</span>
          <input
            className="cl-year-tokens__add-input"
            type="text"
            inputMode="numeric"
            placeholder="1978"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addYear(draft);
              }
            }}
            onBlur={() => {
              if (draft.trim()) addYear(draft);
            }}
          />
        </label>
      </div>
    </div>
  );
}
