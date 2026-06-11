"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { JobQueuePanel } from "@/components/ops/content-creator/JobQueuePanel";
import { PromptInspectorModal, QualityPanel } from "@/components/ops/content-creator/PromptInspectorModal";
import { PassQrSafeAreaOverlay } from "@/components/ops/content-creator/PassQrSafeAreaOverlay";
import type { ComposedRvbrPrompt, PromptQualityScores } from "@/lib/creative/rvbr-prompt-types";
import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import { RETROVERSE_COLLECTIBLE_CREDENTIAL_LABEL } from "@/lib/creative/artifact-archetypes";
import {
  CREATIVE_DIRECTIONS,
  CREATIVE_DIRECTION_IDS,
  type CreativeDirectionId,
} from "@/lib/ops/content-creator/creative-direction";
import type { ContentArtifactType, ContentCreatorEraOption } from "@/lib/ops/content-creator/types";
import type { QrVerificationResult } from "@/lib/ops/creative-lab/pass-export-composite";
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
  qrVerification?: QrVerificationResult;
};

type ContentFields = {
  event: string;
  venue: string;
  date: string;
  secondaryLine: string;
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
    secondaryLine: CONTENT_CREATOR_DEFAULTS.secondaryLine,
    passTypeLabel: CONTENT_CREATOR_DEFAULTS.passTypeLabel,
    qrUrl: CONTENT_CREATOR_DEFAULTS.qrUrl,
  };
}

function creativePayload(
  creativeDirection: CreativeDirectionId,
  avoidEraTropes: boolean,
  maximizeVariation: boolean,
) {
  return {
    creativeDirection,
    avoidEraTropes,
    maximizeVariation,
    artifactArchetype: CONTENT_CREATOR_DEFAULTS.artifactArchetype,
  };
}

function fieldsPayload(prefix: "front" | "back", f: ContentFields) {
  return {
    [`${prefix}Event`]: f.event,
    [`${prefix}Venue`]: f.venue,
    [`${prefix}Date`]: f.date,
    [`${prefix}SecondaryLine`]: f.secondaryLine,
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
  const searchParams = useSearchParams();
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
  const [promptInspector, setPromptInspector] = useState<{
    front: ComposedRvbrPrompt | null;
    back: ComposedRvbrPrompt | null;
  }>({ front: null, back: null });
  const [qualityScores, setQualityScores] = useState<PromptQualityScores | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  useEffect(() => {
    const runId = searchParams.get("runId");
    const duplicateId = searchParams.get("duplicate");
    const loadId = duplicateId ?? runId;
    if (!loadId) return;

    void (async () => {
      try {
        const res = await fetch(`/api/ops/content-creator/library/${encodeURIComponent(loadId)}`);
        const data = (await res.json()) as {
          ok?: boolean;
          generation?: {
            runId: string;
            eraSlug: string;
            creativeDirection: CreativeDirectionId;
            creativeSettings?: {
              creativeDirection: CreativeDirectionId;
              avoidEraTropes: boolean;
              maximizeVariation: boolean;
            };
            event: string;
            venue: string;
            date: string;
            secondaryLine: string;
            passTypeLabel: string;
            qrUrl: string;
            exportZipPath: string | null;
            frontUrl: string;
            backUrl: string;
          };
        };
        if (!res.ok || !data.generation) return;
        const g = data.generation;
        setEraSlug(g.eraSlug);
        setCreativeDirection(g.creativeDirection);
        if (g.creativeSettings) {
          setCreativeDirection(g.creativeSettings.creativeDirection);
          setAvoidEraTropes(g.creativeSettings.avoidEraTropes);
          setMaximizeVariation(g.creativeSettings.maximizeVariation);
        }
        const fields = {
          event: g.event,
          venue: g.venue,
          date: g.date,
          secondaryLine: g.secondaryLine,
          passTypeLabel: g.passTypeLabel as ControlledPassTypeLabel,
          qrUrl: g.qrUrl,
        };
        setTop(fields);
        setFront(fields);
        setBack(fields);

        if (duplicateId) {
          const t = Date.now();
          setRun({
            runId: "",
            frontUrl: `${g.frontUrl}?t=${t}`,
            backUrl: `${g.backUrl}?t=${t}`,
          });
          return;
        }

        const t = Date.now();
        setRun({
          runId: g.runId,
          frontUrl: `/api/ops/content-creator/vnext/files/${encodeURIComponent(g.runId)}/front.png?t=${t}`,
          backUrl: `/api/ops/content-creator/vnext/files/${encodeURIComponent(g.runId)}/back.png?t=${t}`,
          exportZipUrl: g.exportZipPath
            ? `/api/ops/content-creator/vnext/files/${encodeURIComponent(g.runId)}/${encodeURIComponent(g.exportZipPath.split("/").pop() ?? "")}`
            : undefined,
        });
      } catch {
        // library entry may exist without live vnext run
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when query present
  }, [searchParams]);

  async function composePrompts(): Promise<void> {
    const payload = {
      eraSlug,
      artifact,
      event: top.event,
      venue: top.venue,
      date: top.date,
      secondaryLine: top.secondaryLine,
      passTypeLabel: top.passTypeLabel,
      qrUrl: top.qrUrl,
      compositionSeed: Date.now(),
      ...creativePayload(creativeDirection, avoidEraTropes, maximizeVariation),
    };

    const [frontRes, backRes] = await Promise.all([
      fetch("/api/ops/content-creator/vnext/compose-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, side: "front" }),
      }),
      fetch("/api/ops/content-creator/vnext/compose-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, side: "back" }),
      }),
    ]);

    const frontData = (await frontRes.json()) as ComposedRvbrPrompt & { ok?: boolean; error?: string };
    const backData = (await backRes.json()) as ComposedRvbrPrompt & { ok?: boolean; error?: string };
    if (!frontRes.ok || !frontData.finalPrompt) throw new Error(frontData.error ?? "compose_front_failed");
    if (!backRes.ok || !backData.finalPrompt) throw new Error(backData.error ?? "compose_back_failed");

    setPromptInspector({ front: frontData, back: backData });
    setQualityScores(frontData.qualityScores);
  }

  async function viewPrompt() {
    setBusy(true);
    setError(null);
    try {
      await composePrompts();
      setInspectorOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "compose_failed");
    } finally {
      setBusy(false);
    }
  }

  async function pollJobUntilDone(jobId: string): Promise<RunState> {
    for (let i = 0; i < 180; i++) {
      const res = await fetch(`/api/ops/content-creator/jobs/${encodeURIComponent(jobId)}`);
      const data = (await res.json()) as {
        ok?: boolean;
        job?: {
          status: string;
          error: string | null;
          result: { runId?: string; frontUrl?: string; backUrl?: string } | null;
        };
      };
      const job = data.job;
      if (!res.ok || !job) throw new Error("job_poll_failed");
      if (job.status === "completed" && job.result?.runId) {
        const t = Date.now();
        return {
          runId: job.result.runId,
          frontUrl: `${job.result.frontUrl ?? `/api/ops/content-creator/vnext/files/${job.result.runId}/front.png`}?t=${t}`,
          backUrl: `${job.result.backUrl ?? `/api/ops/content-creator/vnext/files/${job.result.runId}/back.png`}?t=${t}`,
        };
      }
      if (job.status === "failed") throw new Error(job.error ?? "generate_failed");
      await new Promise((r) => setTimeout(r, 2000));
    }
    throw new Error("job_timeout");
  }

  async function generate() {
    setBusy(true);
    setError(null);
    const f = { ...top };
    const b = { ...top };
    setFront(f);
    setBack(b);
    try {
      const payload = {
        eraSlug,
        artifact,
        ...fieldsPayload("front", f),
        ...fieldsPayload("back", b),
        ...creativePayload(creativeDirection, avoidEraTropes, maximizeVariation),
        background: true,
      };
      const res = await fetch("/api/ops/content-creator/vnext/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as RunState & {
        ok?: boolean;
        error?: string;
        background?: boolean;
        jobId?: string;
        promptInspector?: { front: ComposedRvbrPrompt; back: ComposedRvbrPrompt };
        qualityScores?: PromptQualityScores;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "generate_failed");

      if (data.background && data.jobId) {
        const result = await pollJobUntilDone(data.jobId);
        setRun(result);
        return;
      }

      setRun({
        runId: data.runId,
        frontUrl: `${data.frontUrl}?t=${Date.now()}`,
        backUrl: `${data.backUrl}?t=${Date.now()}`,
      });
      if (data.promptInspector) {
        setPromptInspector(data.promptInspector);
        setQualityScores(data.qualityScores ?? data.promptInspector.front.qualityScores);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "generate_failed");
    } finally {
      setBusy(false);
    }
  }

  async function printScanTest() {
    if (!run?.runId) return;
    try {
      const res = await fetch("/api/ops/content-creator/vnext/print-scan-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: run.runId }),
      });
      if (!res.ok) throw new Error("print_scan_test_failed");
      const html = await res.text();
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "print_scan_test_failed");
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
      setRun({ ...run, frontUrl: `${data.frontUrl}?t=${Date.now()}`, exportZipUrl: undefined, qrVerification: undefined });
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
      setRun({ ...run, backUrl: `${data.backUrl}?t=${Date.now()}`, exportZipUrl: undefined, qrVerification: undefined });
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
      const data = (await res.json()) as RunState & { ok?: boolean; error?: string; qrVerification?: QrVerificationResult };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "export_failed");
      setRun({
        ...run,
        frontUrl: `${data.frontUrl}?t=${Date.now()}`,
        backUrl: `${data.backUrl}?t=${Date.now()}`,
        exportZipUrl: data.exportZipUrl,
        qrVerification: data.qrVerification,
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
          <span>Secondary Line</span>
          <input
            value={fields.secondaryLine}
            onChange={(e) => onChange({ ...fields, secondaryLine: e.target.value })}
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

  const qrWarn =
    run?.qrVerification &&
    (run.qrVerification.matrixFillWarning ||
      run.qrVerification.printSizeWarning ||
      !run.qrVerification.decodePass);

  return (
    <div className="cc-creator">
      <JobQueuePanel />
      <header className="cc-creator__titlebar">
        <h1>Content Creator</h1>
        <Link href="/ops/content-creator" className="cc-creator__btn cc-creator__btn--secondary">
          ← Library
        </Link>
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
          <div className="cc-creator__preview-frame cc-creator__preview-frame--back">
            <div className="cc-creator__pass-aspect">
              {run?.backUrl ? (
                <>
                  <img src={run.backUrl} alt="Back artwork preview" className="cc-creator__pass-img" />
                  <PassQrSafeAreaOverlay />
                </>
              ) : (
                <p className="cc-creator__preview-placeholder">Generate to see your pass back</p>
              )}
            </div>
          </div>
          {qrWarn ? (
            <div className="cc-creator__qr-warning" role="alert">
              {run?.qrVerification?.printSizeWarning
                ? `QR below recommended print size (${run.qrVerification.physicalWidthIn.toFixed(2)}") — lanyard scan may fail. `
                : null}
              {run?.qrVerification?.matrixFillWarning
                ? `Matrix fill ${run.qrVerification.matrixFillPercent.toFixed(0)}% is below 85% target. `
                : null}
              {!run?.qrVerification?.decodePass ? "Decode test failed — re-export before printing." : null}
            </div>
          ) : null}
          {run?.qrVerification ? (
            <div className="cc-creator__qr-status" aria-live="polite">
              <p>
                Matrix fill: {run.qrVerification.matrixFillPercent.toFixed(1)}% · Physical:{" "}
                {run.qrVerification.physicalWidthIn.toFixed(2)}" × {run.qrVerification.physicalHeightIn.toFixed(2)}"
              </p>
              <p className={run.qrVerification.decodePass ? "cc-creator__qr-pass" : "cc-creator__qr-fail"}>
                Scan Test: {run.qrVerification.decodePass ? "PASS" : "FAIL"}
              </p>
              <button
                type="button"
                className="cc-creator__btn cc-creator__btn--secondary cc-creator__print-scan-btn"
                onClick={() => void printScanTest()}
              >
                Print Scan Test
              </button>
            </div>
          ) : run?.runId ? (
            <div className="cc-creator__qr-status">
              <button
                type="button"
                className="cc-creator__btn cc-creator__btn--secondary cc-creator__print-scan-btn"
                onClick={() => void printScanTest()}
              >
                Print Scan Test
              </button>
              <p className="cc-creator__qr-hint">Export first for QR verification metrics.</p>
            </div>
          ) : null}
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

        <div className="cc-creator__setup-group">
          <span className="cc-creator__setup-label">Artifact Type</span>
          <p className="cc-creator__fixed-archetype">{RETROVERSE_COLLECTIBLE_CREDENTIAL_LABEL}</p>
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
            <span>Secondary Line</span>
            <input
              value={top.secondaryLine}
              onChange={(e) => setTop({ ...top, secondaryLine: e.target.value })}
            />
          </label>
        </div>

        {qualityScores ? (
          <QualityPanel scores={qualityScores} />
        ) : null}
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
        <button
          type="button"
          className="cc-creator__btn cc-creator__btn--secondary"
          disabled={busy || !eraSlug}
          onClick={() => void viewPrompt()}
        >
          View Prompt
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

      <PromptInspectorModal
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        front={promptInspector.front}
        back={promptInspector.back}
      />
    </div>
  );
}
