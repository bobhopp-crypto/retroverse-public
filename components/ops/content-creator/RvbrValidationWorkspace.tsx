"use client";

import { useState, type CSSProperties } from "react";

import { RVBR_VALIDATION_ERAS } from "@/lib/ops/content-creator/rvbr-era-visual-dna";

type ValidationEra = {
  slug: string;
  name: string;
  years: string;
  accent: string | null;
  visualWorldId: string;
  filename: string;
  mandateSummary: string;
  imageUrl: string;
};

type ValidationResult = {
  runId: string;
  runDir: string;
  event: string;
  venue: string;
  date: string;
  featuredYears: number[];
  eras: ValidationEra[];
};

const ERA_EXPECTATIONS: Record<string, string> = {
  "1958-1961": "Early TV · ballroom credential · cream stock · no neon",
  "1966-1969": "Psychedelic · ornate festival · hand-drawn · Summer of Love",
  "1982-1985": "MTV broadcast · neon · geometric TV framing · high energy",
  "1990-1993": "Grunge · distressed · xerox · darker alternative mood",
};

export function RvbrValidationWorkspace() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResult | null>(null);

  async function runValidation() {
    setBusy(true);
    setError(null);
    setStatus(`Generating ${RVBR_VALIDATION_ERAS.length} era fronts… (~8–20 min)`);
    try {
      const res = await fetch("/api/ops/content-creator/rvbr-validation", { method: "POST" });
      const data = (await res.json()) as ValidationResult & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "validation_failed");
      setResult(data);
      setStatus("Validation complete — compare eras below.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "validation_failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cc-validate">
      <header className="cc-validate__head">
        <div>
          <h1>RVBR Visual Validation</h1>
          <p>Same event · four eras · prove visual separation</p>
        </div>
        <nav className="cc-validate__nav">
          <a href="/ops/content-creator/debug">← Debug</a>
        </nav>
      </header>

      <section className="cc-validate__brief">
        <div>
          <strong>Fixed event data</strong>
          <p>Sunday Nights · The Main Pub · June 14, 2026 · 1967 · 1978 · 1992</p>
        </div>
        <div>
          <strong>Eras tested</strong>
          <p>{RVBR_VALIDATION_ERAS.join(" · ")}</p>
        </div>
        <button
          type="button"
          className="cc-btn cc-btn--primary cc-validate__run"
          disabled={busy}
          onClick={() => void runValidation()}
        >
          {busy ? "Generating…" : "Run RVBR Validation"}
        </button>
      </section>

      {status ? <p className="cc-validate__status">{status}</p> : null}
      {error ? <p className="cc-validate__error">{error}</p> : null}

      <section className="cc-validate__grid" aria-label="Era comparison">
        {(result?.eras ?? RVBR_VALIDATION_ERAS.map((slug) => ({ slug }))).map((era) => {
          const full = result?.eras.find((e) => e.slug === era.slug);
          const slug = era.slug;
          return (
            <figure
              key={slug}
              className="cc-validate__card"
              style={
                full?.accent
                  ? ({ "--era-accent": full.accent } as CSSProperties)
                  : undefined
              }
            >
              <figcaption>
                <strong>{full?.years ?? slug}</strong>
                <span>{full?.name ?? slug}</span>
                <em>{ERA_EXPECTATIONS[slug]}</em>
                {full ? <code>{full.visualWorldId}</code> : null}
              </figcaption>
              <div className="cc-validate__frame">
                {full?.imageUrl ? (
                  <img src={full.imageUrl} alt={`${full.name} pass front`} />
                ) : (
                  <div className="cc-validate__placeholder">—</div>
                )}
              </div>
            </figure>
          );
        })}
      </section>

      {result ? (
        <footer className="cc-validate__foot">
          <p>
            <strong>Pass/fail:</strong> Each era should look like a different visual world — not the same MTV
            laminate with minor tweaks.
          </p>
          <code>{result.runDir}</code>
        </footer>
      ) : null}
    </div>
  );
}
