"use client";

import { useState } from "react";

import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import type { ContentCreatorEraOption } from "@/lib/ops/content-creator/types";
import { resolveVisualWorldFromRvbr } from "@/lib/ops/content-creator/resolve-visual-world";
import {
  CONTROLLED_PASS_TYPE_LABELS,
  normalizePassTypeLabel,
  type ControlledPassTypeLabel,
} from "@/lib/ops/creative-lab/pass-text-governance";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

type PocArtifact = {
  id: string;
  label: string;
  filename: string;
  url: string;
  group: "v1" | "v2-artwork" | "v2-composite";
  side: "front" | "back";
};

type PocResult = {
  runId: string;
  runDir: string;
  exportZipUrl: string;
  artifacts: PocArtifact[];
  qrVerification: { ok: boolean; notes: string[] } | null;
};

type Props = {
  eras: ContentCreatorEraOption[];
};

function eraToProfile(era: ContentCreatorEraOption): RvbrProfile {
  const [startRaw, endRaw] = era.years.split("–");
  return {
    id: era.retroverseEraId,
    retroverseEraId: era.retroverseEraId,
    slug: era.slug,
    name: era.name,
    eraStartYear: Number.parseInt(startRaw ?? "0", 10),
    eraEndYear: Number.parseInt(endRaw ?? "0", 10),
    narrative: era.narrative,
    visualIdentity: {
      canonSource: "data/rvbr/eras-canon.json",
      title: era.name,
      accent: era.visualIdentity.accent,
      subtitle: era.visualIdentity.subtitle,
      sections: era.visualIdentity.sections,
    },
    promptFragments: era.promptFragments,
    notes: null,
    createdAt: "",
    updatedAt: "",
  };
}

function ComparisonCard(props: { title: string; subtitle: string; artifact?: PocArtifact; tall?: boolean }) {
  const { title, subtitle, artifact, tall } = props;
  return (
    <figure className={`cc-poc-card${tall ? " cc-poc-card--tall" : ""}`}>
      <figcaption>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </figcaption>
      <div className="cc-poc-card__frame">
        {artifact ? (
          <img src={artifact.url} alt={artifact.label} className="cc-poc-card__img" />
        ) : (
          <div className="cc-poc-card__empty">—</div>
        )}
      </div>
      {artifact ? <code className="cc-poc-card__file">{artifact.filename}</code> : null}
    </figure>
  );
}

export function V2PocWorkspace({ eras }: Props) {
  const [eraSlug, setEraSlug] = useState("1982-1985");
  const [event, setEvent] = useState(CONTENT_CREATOR_DEFAULTS.event);
  const [venue, setVenue] = useState(CONTENT_CREATOR_DEFAULTS.venue);
  const [date, setDate] = useState(CONTENT_CREATOR_DEFAULTS.date);
  const [years, setYears] = useState<number[]>([...CONTENT_CREATOR_DEFAULTS.featuredYears]);
  const [passTypeLabel, setPassTypeLabel] = useState<ControlledPassTypeLabel>(
    CONTENT_CREATOR_DEFAULTS.passTypeLabel,
  );
  const [qrUrl, setQrUrl] = useState(CONTENT_CREATOR_DEFAULTS.qrUrl);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PocResult | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const selectedEra = eras.find((e) => e.slug === eraSlug) ?? eras[0];
  const visualWorldId = resolveVisualWorldFromRvbr(
    selectedEra ? eraToProfile(selectedEra) : null,
  );

  function artifact(id: string): PocArtifact | undefined {
    return result?.artifacts.find((a) => a.id === id);
  }

  async function runPoc() {
    setBusy(true);
    setError(null);
    setStatus("Generating v1 baseline + v2 Phase 1 artwork layers… (~3–8 min)");
    try {
      const res = await fetch("/api/ops/content-creator/v2-poc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          venue,
          date,
          featuredYears: years,
          passTypeLabel,
          qrUrl,
          eraSlug,
          visualWorldId,
        }),
      });
      const data = (await res.json()) as PocResult & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "poc_failed");
      setResult(data);
      setStatus("Phase 1 run complete — compare v1 vs v2 below.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "poc_failed");
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cc-poc">
      <header className="cc-poc__head">
        <div>
          <h1>Content Creator v2 — Phase 1</h1>
          <p>Zone-based credential layout — AI artwork + Retroverse typography</p>
        </div>
        <a href="/ops/content-creator" className="cc-btn cc-btn--ghost">
          ← v1 Workflow
        </a>
      </header>

      <section className="cc-poc__controls">
        <label>
          <span>Era</span>
          <select value={eraSlug} onChange={(e) => setEraSlug(e.target.value)}>
            {eras.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.years} — {e.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Event</span>
          <input value={event} onChange={(e) => setEvent(e.target.value)} />
        </label>
        <label>
          <span>Venue</span>
          <input value={venue} onChange={(e) => setVenue(e.target.value)} />
        </label>
        <label>
          <span>Date</span>
          <input value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>Years</span>
          <input
            value={years.join(", ")}
            onChange={(e) =>
              setYears(
                e.target.value
                  .split(/[,·\s]+/)
                  .map((s) => Number.parseInt(s.trim(), 10))
                  .filter((y) => Number.isFinite(y)),
              )
            }
          />
        </label>
        <label>
          <span>Pass type</span>
          <select
            value={passTypeLabel}
            onChange={(e) => setPassTypeLabel(normalizePassTypeLabel(e.target.value))}
          >
            {CONTROLLED_PASS_TYPE_LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>QR URL</span>
          <input value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} />
        </label>
        <button
          type="button"
          className="cc-btn cc-btn--primary cc-poc__run"
          disabled={busy}
          onClick={() => void runPoc()}
        >
          {busy ? "Running Phase 1…" : "Run v2 Phase 1 Comparison"}
        </button>
      </section>

      {status ? <p className="cc-poc__status">{status}</p> : null}
      {error ? <p className="cc-poc__error">{error}</p> : null}

      <section className="cc-poc__compare" aria-label="Side-by-side comparison">
        <h2>Primary comparison — Front</h2>
        <p className="cc-poc__compare-hint">
          Left: v1 Current (AI-generated complete credential). Right: v2 Phase 1 (zone typography, no opaque panels).
        </p>
        <div className="cc-poc__row cc-poc__row--hero">
          <ComparisonCard
            title="v1 Current"
            subtitle="AI generates complete pass including text"
            artifact={artifact("v1-front")}
            tall
          />
          <ComparisonCard
            title="v2 Phase 1"
            subtitle="Zone layout · RVBR typography · artwork preserved"
            artifact={artifact("v2-composite-front")}
            tall
          />
        </div>

        <h2>v2 pipeline detail</h2>
        <div className="cc-poc__row">
          <ComparisonCard
            title="Artwork layer"
            subtitle="Front — zero text"
            artifact={artifact("v2-artwork-front")}
          />
          <ComparisonCard
            title="Artwork layer"
            subtitle="Back — zero text"
            artifact={artifact("v2-artwork-back")}
          />
          <ComparisonCard
            title="Credential layout"
            subtitle="Back — zone text + QR + serial frame"
            artifact={artifact("v2-composite-back")}
          />
        </div>
      </section>

      {result ? (
        <footer className="cc-poc__footer">
          <div>
            <strong>Export path (v2 composites only)</strong>
            <code>{result.runDir}</code>
          </div>
          {result.qrVerification ? (
            <p className={result.qrVerification.ok ? "cc-poc__qr-ok" : "cc-poc__qr-bad"}>
              QR: {result.qrVerification.ok ? "verified scannable" : "verification failed"}
              {result.qrVerification.notes[0] ? ` — ${result.qrVerification.notes[0]}` : ""}
            </p>
          ) : null}
          <a className="cc-btn cc-btn--export" href={result.exportZipUrl} download>
            Download v2 Phase 1 Package
          </a>
        </footer>
      ) : null}
    </div>
  );
}
