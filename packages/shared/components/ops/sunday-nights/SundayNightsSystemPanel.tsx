"use client";

import { useCallback, useState } from "react";

type ValidationResponse = {
  pass?: boolean;
  failures?: string[];
  checks?: { name: string; ok: boolean; detail?: string }[];
  error?: string;
};

type RefreshReport = {
  refreshedAt: string;
  mode: "local" | "production";
  snapshotsWritten: boolean;
  songsByYear: Record<string, number>;
  assets: number;
  rvtrMatched: number;
  noRvtr: number;
  aliases: number;
  validation: "PASS" | "FAIL";
  validationDetails: string[];
  notes: string[];
};

type DeployPreview = {
  branch: string;
  commit: string;
  message: string;
  repo: string;
};

type DeployResult = {
  ok: boolean;
  branch: string;
  commit: string;
  url: string;
  status: "PASS" | "FAIL";
  detail: string;
};

function ReportBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="sn-admin__system-report">
      <p className="sn-admin__system-report-title">{title}</p>
      <div className="sn-admin__system-report-body">{children}</div>
    </div>
  );
}

export function SundayNightsSystemPanel() {
  const [busy, setBusy] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [refreshReport, setRefreshReport] = useState<RefreshReport | null>(null);
  const [deployStep, setDeployStep] = useState<"idle" | "pin" | "confirm">("idle");
  const [deployPreview, setDeployPreview] = useState<DeployPreview | null>(null);
  const [deployPin, setDeployPin] = useState("");
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runValidate = useCallback(async () => {
    setBusy("validate");
    setError(null);
    try {
      const res = await fetch("/api/ops/sunday-nights/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "validate" }),
      });
      const data = (await res.json()) as ValidationResponse;
      if (!res.ok) {
        setError(data.error ?? "Validate failed");
        return;
      }
      setValidation(data);
    } catch {
      setError("Validate request failed");
    } finally {
      setBusy(null);
    }
  }, []);

  const runRefresh = useCallback(async () => {
    setBusy("refresh");
    setError(null);
    try {
      const res = await fetch("/api/ops/sunday-nights/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "refresh" }),
      });
      const data = (await res.json()) as { report?: RefreshReport; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Refresh failed");
        return;
      }
      if (data.report) setRefreshReport(data.report);
    } catch {
      setError("Refresh request failed");
    } finally {
      setBusy(null);
    }
  }, []);

  async function startDeploy() {
    setError(null);
    setDeployResult(null);
    setBusy("deploy-preview");
    try {
      const res = await fetch("/api/ops/sunday-nights/system?action=deployPreview");
      const data = (await res.json()) as {
        preview?: DeployPreview;
        hookConfigured?: boolean;
        error?: string;
      };
      if (!res.ok || !data.preview) {
        setError(data.error ?? "Could not load deploy preview");
        return;
      }
      if (!data.hookConfigured) {
        setError("Deploy hook not configured (VERCEL_DEPLOY_HOOK_URL)");
        return;
      }
      setDeployPreview(data.preview);
      setDeployPin("");
      setDeployStep("pin");
    } catch {
      setError("Deploy preview failed");
    } finally {
      setBusy(null);
    }
  }

  function submitDeployPin() {
    if (!deployPin.trim()) return;
    setDeployStep("confirm");
  }

  async function executeDeploy() {
    if (!deployPreview) return;
    setBusy("deploy");
    setError(null);
    try {
      const res = await fetch("/api/ops/sunday-nights/system", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "deploy", pin: deployPin, confirm: true }),
      });
      const data = (await res.json()) as {
        result?: DeployResult;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Deploy failed");
        setDeployStep("idle");
        return;
      }
      if (data.result) setDeployResult(data.result);
      setDeployStep("idle");
    } catch {
      setError("Deploy request failed");
      setDeployStep("idle");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="sn-admin__system" aria-labelledby="sn-system-heading">
      <h2 id="sn-system-heading" className="sn-admin__system-heading">
        System
      </h2>
      <p className="sn-admin__system-lead">
        Pre-event data refresh, health checks, and production deploy.
      </p>

      <div className="sn-admin__system-actions">
        <button
          type="button"
          className="sn-admin__btn sn-admin__system-btn"
          disabled={busy != null}
          onClick={() => runRefresh()}
        >
          {busy === "refresh" ? "Refreshing…" : "Refresh Data"}
        </button>
        <button
          type="button"
          className="sn-admin__btn sn-admin__system-btn"
          disabled={busy != null}
          onClick={() => runValidate()}
        >
          {busy === "validate" ? "Validating…" : "Validate"}
        </button>
        <button
          type="button"
          className="sn-admin__btn sn-admin__system-btn sn-admin__system-btn--deploy"
          disabled={busy != null || deployStep !== "idle"}
          onClick={() => startDeploy()}
        >
          {busy === "deploy-preview" ? "Loading…" : "Deploy"}
        </button>
      </div>

      {error ? (
        <p className="sn-admin__system-error" role="alert">
          {error}
        </p>
      ) : null}

      {refreshReport ? (
        <ReportBlock title="Refresh report">
          <ul className="sn-admin__system-lines">
            <li>1967 Songs: {refreshReport.songsByYear["1967"] ?? 0}</li>
            <li>1978 Songs: {refreshReport.songsByYear["1978"] ?? 0}</li>
            <li>1992 Songs: {refreshReport.songsByYear["1992"] ?? 0}</li>
            <li>Assets: {refreshReport.assets}</li>
            <li>RVTR Matched: {refreshReport.rvtrMatched}</li>
            <li>NO RVTR: {refreshReport.noRvtr}</li>
            <li>Aliases: {refreshReport.aliases}</li>
            <li>
              Validation:{" "}
              <strong
                className={
                  refreshReport.validation === "PASS"
                    ? "sn-admin__system-pass"
                    : "sn-admin__system-fail"
                }
              >
                {refreshReport.validation}
              </strong>
            </li>
          </ul>
          {refreshReport.notes.length > 0 ? (
            <ul className="sn-admin__system-notes">
              {refreshReport.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </ReportBlock>
      ) : null}

      {validation ? (
        <ReportBlock title={`Validation: ${validation.pass ? "PASS" : "FAIL"}`}>
          {validation.pass ? (
            <p className="sn-admin__system-pass">All checks passed.</p>
          ) : (
            <ul className="sn-admin__system-fail-list">
              {(validation.failures ?? []).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
          <ul className="sn-admin__system-checks">
            {(validation.checks ?? []).map((c) => (
              <li key={c.name} className={c.ok ? "sn-admin__system-check--ok" : ""}>
                {c.ok ? "✓" : "✗"} {c.name}
                {c.detail ? ` — ${c.detail}` : ""}
              </li>
            ))}
          </ul>
        </ReportBlock>
      ) : null}

      {deployStep === "pin" ? (
        <div className="sn-admin__system-modal">
          <p className="sn-admin__system-modal-title">Deploy authorization</p>
          <p className="sn-admin__system-modal-lead">Enter Ops PIN to continue.</p>
          <input
            type="password"
            className="sn-admin__system-pin"
            inputMode="numeric"
            value={deployPin}
            onChange={(e) => setDeployPin(e.target.value)}
            autoComplete="one-time-code"
          />
          <div className="sn-admin__system-modal-actions">
            <button type="button" className="sn-admin__btn" onClick={() => setDeployStep("idle")}>
              Cancel
            </button>
            <button
              type="button"
              className="sn-admin__btn sn-admin__btn--primary"
              disabled={!deployPin.trim()}
              onClick={() => submitDeployPin()}
            >
              Continue
            </button>
          </div>
        </div>
      ) : null}

      {deployStep === "confirm" && deployPreview ? (
        <div className="sn-admin__system-modal">
          <p className="sn-admin__system-modal-title">Deploy to production?</p>
          <ul className="sn-admin__system-lines">
            <li>Branch: {deployPreview.branch}</li>
            <li>Commit: {deployPreview.commit}</li>
            <li>{deployPreview.message || "—"}</li>
          </ul>
          <p className="sn-admin__system-modal-warn">This triggers a Vercel production rebuild.</p>
          <div className="sn-admin__system-modal-actions">
            <button type="button" className="sn-admin__btn" onClick={() => setDeployStep("idle")}>
              Cancel
            </button>
            <button
              type="button"
              className="sn-admin__btn sn-admin__btn--primary"
              disabled={busy === "deploy"}
              onClick={() => executeDeploy()}
            >
              {busy === "deploy" ? "Deploying…" : "Confirm deploy"}
            </button>
          </div>
        </div>
      ) : null}

      {deployResult ? (
        <ReportBlock title={`Deploy: ${deployResult.status}`}>
          <ul className="sn-admin__system-lines">
            <li>Branch: {deployResult.branch}</li>
            <li>Commit: {deployResult.commit}</li>
            <li>
              URL:{" "}
              <a href={deployResult.url} target="_blank" rel="noopener noreferrer">
                {deployResult.url}
              </a>
            </li>
            <li>{deployResult.detail}</li>
          </ul>
        </ReportBlock>
      ) : null}
    </section>
  );
}
