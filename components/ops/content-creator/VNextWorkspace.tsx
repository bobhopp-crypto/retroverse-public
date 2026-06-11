"use client";

import { useState, type ReactNode } from "react";

import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import {
  CREATIVE_DIRECTIONS,
  CREATIVE_DIRECTION_IDS,
  type CreativeDirectionId,
} from "@/lib/ops/content-creator/creative-direction";
import type { ContentArtifactType, ContentCreatorEraOption } from "@/lib/ops/content-creator/types";
import {
  CONTROLLED_PASS_TYPE_LABELS,
  normalizePassTypeLabel,
  type ControlledPassTypeLabel,
} from "@/lib/ops/creative-lab/pass-text-governance";

type Props = {
  eras: ContentCreatorEraOption[];
};

type RunState = {
  runId: string;
  frontUrl: string | null;
  backUrl: string | null;
  exportZipUrl?: string;
};

type ContentFields = {
  event: string;
  venue: string;
  date: string;
  years: number[];
  passTypeLabel: ControlledPassTypeLabel;
  qrUrl: string;
};

const ARTIFACTS: { id: ContentArtifactType; label: string; enabled: boolean }[] = [
  { id: "pass", label: "Pass", enabled: true },
  { id: "poster", label: "Poster", enabled: false },
  { id: "bumper", label: "Bumper", enabled: false },
  { id: "social", label: "Social", enabled: false },
  { id: "slide", label: "Slide", enabled: false },
];

function defaultFields(): ContentFields {
  return {
    event: CONTENT_CREATOR_DEFAULTS.event,
    venue: CONTENT_CREATOR_DEFAULTS.venue,
    date: CONTENT_CREATOR_DEFAULTS.date,
    years: [...CONTENT_CREATOR_DEFAULTS.featuredYears],
    passTypeLabel: CONTENT_CREATOR_DEFAULTS.passTypeLabel,
    qrUrl: CONTENT_CREATOR_DEFAULTS.qrUrl,
  };
}

function creativePayload(creativeDirection: CreativeDirectionId, avoidEraTropes: boolean, maximizeVariation: boolean) {
  return { creativeDirection, avoidEraTropes, maximizeVariation };
}

function fieldsPayload(prefix: "front" | "back", f: ContentFields) {
  return {
    [`${prefix}Event`]: f.event,
    [`${prefix}Venue`]: f.venue,
    [`${prefix}Date`]: f.date,
    [`${prefix}FeaturedYears`]: f.years,
    [`${prefix}PassTypeLabel`]: f.passTypeLabel,
    ...(prefix === "back" ? { backQrUrl: f.qrUrl } : {}),
  };
}

function CollapsiblePanel(props: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={`cc-creator__panel${props.open ? " is-open" : ""}`}>
      <button type="button" className="cc-creator__panel-toggle" onClick={props.onToggle} aria-expanded={props.open}>
        <span>{props.title}</span>
        <span className="cc-creator__panel-chevron" aria-hidden>
          {props.open ? "−" : "+"}
        </span>
      </button>
      {props.open ? <div className="cc-creator__panel-body">{props.children}</div> : null}
    </div>
  );
}

export function VNextWorkspace({ eras }: Props) {
  const [artifact, setArtifact] = useState<ContentArtifactType>("pass");
  const [eraSlug, setEraSlug] = useState(eras[0]?.slug ?? "");
  const [creativeDirection, setCreativeDirection] = useState<CreativeDirectionId>(
    CONTENT_CREATOR_DEFAULTS.creativeDirection,
  );
  const [avoidEraTropes, setAvoidEraTropes] = useState(CONTENT_CREATOR_DEFAULTS.avoidEraTropes);
  const [maximizeVariation, setMaximizeVariation] = useState(CONTENT_CREATOR_DEFAULTS.maximizeVariation);
  const [top, setTop] = useState(defaultFields);
  const [front, setFront] = useState(defaultFields);
  const [back, setBack] = useState(defaultFields);
  const [frontOpen, setFrontOpen] = useState(false);
  const [backOpen, setBackOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);

  function parseYears(raw: string): number[] {
    return raw
      .split(/[,·\s]+/)
      .map((s) => Number.parseInt(s.trim(), 10))
      .filter((y) => Number.isFinite(y));
  }

  async function generate() {
    setBusy(true);
    setError(null);
    const f = { ...top };
    const b = { ...top };
    setFront(f);
    setBack(b);
    try {
      const res = await fetch("/api/ops/content-creator/vnext/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eraSlug,
          artifact,
          ...fieldsPayload("front", f),
          ...fieldsPayload("back", b),
          ...creativePayload(creativeDirection, avoidEraTropes, maximizeVariation),
        }),
      });
      const data = (await res.json()) as RunState & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "generate_failed");
      setRun({
        runId: data.runId,
        frontUrl: `${data.frontUrl}?t=${Date.now()}`,
        backUrl: `${data.backUrl}?t=${Date.now()}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "generate_failed");
    } finally {
      setBusy(false);
    }
  }

  async function regenerateFront() {
    if (!run) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/content-creator/vnext/regenerate-front", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.runId,
          eraSlug,
          ...fieldsPayload("front", front),
          ...creativePayload(creativeDirection, avoidEraTropes, maximizeVariation),
        }),
      });
      const data = (await res.json()) as RunState & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "regenerate_failed");
      setRun({ ...run, frontUrl: `${data.frontUrl}?t=${Date.now()}`, exportZipUrl: undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : "regenerate_failed");
    } finally {
      setBusy(false);
    }
  }

  async function regenerateBack() {
    if (!run) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/content-creator/vnext/regenerate-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: run.runId,
          eraSlug,
          ...fieldsPayload("back", back),
          ...creativePayload(creativeDirection, avoidEraTropes, maximizeVariation),
        }),
      });
      const data = (await res.json()) as RunState & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "regenerate_failed");
      setRun({ ...run, backUrl: `${data.backUrl}?t=${Date.now()}`, exportZipUrl: undefined });
    } catch (e) {
      setError(e instanceof Error ? e.message : "regenerate_failed");
    } finally {
      setBusy(false);
    }
  }

  async function exportPackage() {
    if (!run) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/content-creator/vnext/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: run.runId, eraSlug }),
      });
      const data = (await res.json()) as RunState & { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "export_failed");
      setRun({
        ...run,
        frontUrl: `${data.frontUrl}?t=${Date.now()}`,
        backUrl: `${data.backUrl}?t=${Date.now()}`,
        exportZipUrl: data.exportZipUrl,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "export_failed");
    } finally {
      setBusy(false);
    }
  }

  function FieldGrid(props: {
    fields: ContentFields;
    onChange: (f: ContentFields) => void;
    showQr?: boolean;
  }) {
    const { fields, onChange, showQr } = props;
    return (
      <div className="cc-creator__field-grid">
        <label className="cc-creator__field">
          <span>Event</span>
          <input value={fields.event} onChange={(e) => onChange({ ...fields, event: e.target.value })} />
        </label>
        <label className="cc-creator__field">
          <span>Venue</span>
          <input value={fields.venue} onChange={(e) => onChange({ ...fields, venue: e.target.value })} />
        </label>
        <label className="cc-creator__field">
          <span>Date</span>
          <input value={fields.date} onChange={(e) => onChange({ ...fields, date: e.target.value })} />
        </label>
        <label className="cc-creator__field">
          <span>Years</span>
          <input
            value={fields.years.join(", ")}
            onChange={(e) => onChange({ ...fields, years: parseYears(e.target.value) })}
          />
        </label>
        <label className="cc-creator__field">
          <span>Pass type</span>
          <select
            value={fields.passTypeLabel}
            onChange={(e) => onChange({ ...fields, passTypeLabel: normalizePassTypeLabel(e.target.value) })}
          >
            {CONTROLLED_PASS_TYPE_LABELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {showQr ? (
          <label className="cc-creator__field">
            <span>QR URL</span>
            <input value={fields.qrUrl} onChange={(e) => onChange({ ...fields, qrUrl: e.target.value })} />
          </label>
        ) : null}
      </div>
    );
  }

  return (
    <div className="cc-creator">
      <header className="cc-creator__titlebar">
        <h1>Content Creator</h1>
      </header>

      <section className="cc-creator__hero" aria-label="Artwork previews">
        <figure className="cc-creator__preview">
          <figcaption>Front</figcaption>
          <div className="cc-creator__preview-frame">
            {run?.frontUrl ? (
              <img src={run.frontUrl} alt="Front artwork preview" />
            ) : (
              <p className="cc-creator__preview-placeholder">Generate to see your pass front</p>
            )}
          </div>
        </figure>
        <figure className="cc-creator__preview">
          <figcaption>Back</figcaption>
          <div className="cc-creator__preview-frame">
            {run?.backUrl ? (
              <img src={run.backUrl} alt="Back artwork preview" />
            ) : (
              <p className="cc-creator__preview-placeholder">Generate to see your pass back</p>
            )}
          </div>
        </figure>
      </section>

      <section className="cc-creator__primary-actions">
        <button
          type="button"
          className="cc-creator__btn cc-creator__btn--generate"
          disabled={busy || !eraSlug || !creativeDirection}
          onClick={() => void generate()}
        >
          {busy ? "Creating…" : "Generate"}
        </button>
        <button
          type="button"
          className="cc-creator__btn cc-creator__btn--export"
          disabled={busy || !run}
          onClick={() => void exportPackage()}
        >
          Export
        </button>
        {run?.exportZipUrl ? (
          <a className="cc-creator__btn cc-creator__btn--download" href={run.exportZipUrl} download>
            Download
          </a>
        ) : null}
      </section>

      <section className="cc-creator__setup" aria-label="Project setup">
        <div className="cc-creator__setup-row">
          <div className="cc-creator__setup-group">
            <span className="cc-creator__setup-label">Artifact</span>
            <div className="cc-creator__chips">
              {ARTIFACTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`cc-creator__chip${artifact === a.id ? " is-on" : ""}${!a.enabled ? " is-off" : ""}`}
                  disabled={!a.enabled}
                  onClick={() => a.enabled && setArtifact(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="cc-creator__setup-group">
          <span className="cc-creator__setup-label">Era</span>
          <select
            className="cc-creator__era-select"
            value={eraSlug}
            onChange={(e) => setEraSlug(e.target.value)}
            aria-label="Era"
          >
            {eras.map((era) => (
              <option key={era.slug} value={era.slug}>
                {era.years} — {era.name}
              </option>
            ))}
          </select>
        </div>

        <div className="cc-creator__setup-group">
          <span className="cc-creator__setup-label">Creative Direction</span>
          <div className="cc-creator__direction-grid" role="group" aria-label="Creative Direction">
            {CREATIVE_DIRECTION_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`cc-creator__direction-btn${creativeDirection === id ? " is-on" : ""}`}
                onClick={() => setCreativeDirection(id)}
                aria-pressed={creativeDirection === id}
              >
                {CREATIVE_DIRECTIONS[id].label}
              </button>
            ))}
          </div>
        </div>

        <div className="cc-creator__toggles">
          <label className="cc-creator__toggle">
            <input
              type="checkbox"
              checked={avoidEraTropes}
              onChange={(e) => setAvoidEraTropes(e.target.checked)}
            />
            <span>Avoid Common Era Tropes</span>
          </label>
          <label className="cc-creator__toggle">
            <input
              type="checkbox"
              checked={maximizeVariation}
              onChange={(e) => setMaximizeVariation(e.target.checked)}
            />
            <span>Maximize Variation</span>
          </label>
        </div>

        <div className="cc-creator__field-grid cc-creator__field-grid--setup">
          <label className="cc-creator__field">
            <span>Event</span>
            <input value={top.event} onChange={(e) => setTop({ ...top, event: e.target.value })} />
          </label>
          <label className="cc-creator__field">
            <span>Venue</span>
            <input value={top.venue} onChange={(e) => setTop({ ...top, venue: e.target.value })} />
          </label>
          <label className="cc-creator__field">
            <span>Date</span>
            <input value={top.date} onChange={(e) => setTop({ ...top, date: e.target.value })} />
          </label>
          <label className="cc-creator__field">
            <span>Years</span>
            <input
              value={top.years.join(", ")}
              onChange={(e) => setTop({ ...top, years: parseYears(e.target.value) })}
            />
          </label>
        </div>
      </section>

      <section className="cc-creator__secondary-actions">
        <button
          type="button"
          className="cc-creator__btn cc-creator__btn--secondary"
          disabled={busy || !run}
          onClick={() => void regenerateFront()}
        >
          Regenerate Front
        </button>
        <button
          type="button"
          className="cc-creator__btn cc-creator__btn--secondary"
          disabled={busy || !run}
          onClick={() => void regenerateBack()}
        >
          Regenerate Back
        </button>
      </section>

      {error ? <p className="cc-creator__error" role="alert">{error}</p> : null}

      <section className="cc-creator__panels">
        <CollapsiblePanel title="Front content" open={frontOpen} onToggle={() => setFrontOpen((v) => !v)}>
          <FieldGrid fields={front} onChange={setFront} />
        </CollapsiblePanel>
        <CollapsiblePanel title="Back content" open={backOpen} onToggle={() => setBackOpen((v) => !v)}>
          <FieldGrid fields={back} onChange={setBack} showQr />
        </CollapsiblePanel>
      </section>
    </div>
  );
}
