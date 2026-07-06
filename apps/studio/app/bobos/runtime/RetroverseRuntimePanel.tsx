"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchRetroverseRuntimeStatus,
  runtimeRestart,
  runtimeStart,
  runtimeStop,
  type RetroverseRuntimeStatus,
  type RuntimeHealthLevel,
  type RuntimeServiceCheck,
} from "./actions";

const POLL_MS = 3_000;

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatUptime(seconds: number | null): string {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatMs(ms: number | null): string {
  if (ms == null) return "—";
  return `${ms} ms`;
}

function lampClass(kind: "green" | "amber" | "red" | "dim"): string {
  return `cockpit-lamp cockpit-lamp--${kind}`;
}

function serviceLamp(service: RuntimeServiceCheck): "green" | "amber" | "red" | "dim" {
  if (service.state === "running" || service.state === "connected") return "green";
  if (service.state === "starting" || service.state === "waiting") return "amber";
  if (service.state === "unavailable") return "red";
  return "dim";
}

function healthLamp(level: RuntimeHealthLevel): "green" | "amber" | "red" | "dim" {
  if (level === "healthy") return "green";
  if (level === "degraded") return "amber";
  if (level === "down") return "red";
  return "dim";
}

function healthLabel(level: RuntimeHealthLevel): string {
  if (level === "healthy") return "Healthy";
  if (level === "degraded") return "Degraded";
  if (level === "down") return "Down";
  return "Unknown";
}

function RuntimeServiceRow({ service }: { service: RuntimeServiceCheck }) {
  return (
    <li className="cockpit-runtime__service">
      <span className={lampClass(serviceLamp(service))} aria-hidden="true" />
      <div className="cockpit-runtime__service-body">
        <div className="cockpit-runtime__service-head">
          <span className="cockpit-runtime__service-label">{service.label}</span>
          <span className="cockpit-runtime__service-state">{service.statusLabel}</span>
        </div>
        <div className="cockpit-runtime__service-meta">
          {service.url ? <span>{service.url}</span> : null}
          <span>Checked {formatWhen(service.lastHealthCheck)}</span>
          <span>{formatMs(service.responseMs)}</span>
        </div>
      </div>
    </li>
  );
}

function LiveMonitorColumn({
  title,
  snapshot,
}: {
  title: string;
  snapshot: RetroverseRuntimeStatus["liveMonitor"]["local"] | null;
}) {
  return (
    <div className="cockpit-runtime__monitor-col">
      <h4 className="cockpit-runtime__section-label">{title}</h4>
      {snapshot?.coverUrl ? (
        <img
          src={snapshot.coverUrl}
          alt=""
          className="cockpit-runtime__cover"
          width={72}
          height={72}
        />
      ) : null}
      <ul className="cockpit-runtime__monitor-list">
        <li>Song · {snapshot?.song ?? "—"}</li>
        <li>Artist · {snapshot?.artist ?? "—"}</li>
        <li>RVTR · {snapshot?.rvtr ?? "—"}</li>
        <li>Updated · {formatWhen(snapshot?.updatedAt ?? null)}</li>
        <li>URL · {snapshot?.url ?? "—"}</li>
        {snapshot?.error ? <li className="cockpit-runtime__warn">{snapshot.error}</li> : null}
      </ul>
    </div>
  );
}

export function RetroverseRuntimePanel() {
  const [status, setStatus] = useState<RetroverseRuntimeStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await fetchRetroverseRuntimeStatus());
    } catch {
      // keep last known status
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      if (busy) return;
      try {
        const next = await fetchRetroverseRuntimeStatus();
        if (!cancelled && !busy) setStatus(next);
      } catch {
        // transient — next poll recovers
      }
    }
    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [busy]);

  const run = useCallback(
    async (action: () => Promise<RetroverseRuntimeStatus>) => {
      setBusy(true);
      try {
        setStatus(await action());
      } catch {
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const bothRunning = status?.studio.state === "running" && status?.live.state === "running";

  return (
    <>
      <section className="cockpit-runtime__summary" aria-label="Retroverse Runtime summary">
        <h3 className="cockpit-runtime__title">Retroverse Runtime</h3>
        <ul className="cockpit-runtime__summary-grid">
          <li>
            <span className="cockpit-runtime__summary-key">Development</span>
            <span className="cockpit-runtime__summary-value">
              <span
                className={lampClass(healthLamp(status?.summary.development ?? "unknown"))}
                aria-hidden="true"
              />
              {status ? healthLabel(status.summary.development) : "Checking…"}
            </span>
          </li>
          <li>
            <span className="cockpit-runtime__summary-key">Production</span>
            <span className="cockpit-runtime__summary-value">
              <span
                className={lampClass(healthLamp(status?.summary.production ?? "unknown"))}
                aria-hidden="true"
              />
              {status ? healthLabel(status.summary.production) : "Checking…"}
            </span>
          </li>
          <li>
            <span className="cockpit-runtime__summary-key">Overall Health</span>
            <span className="cockpit-runtime__summary-value">
              <span
                className={lampClass(healthLamp(status?.summary.overallHealth ?? "unknown"))}
                aria-hidden="true"
              />
              {status ? healthLabel(status.summary.overallHealth) : "Checking…"}
            </span>
          </li>
          <li>
            <span className="cockpit-runtime__summary-key">Startup Time</span>
            <span className="cockpit-runtime__summary-value">
              {status?.summary.startupTimeMs != null
                ? `${(status.summary.startupTimeMs / 1000).toFixed(1)}s`
                : "—"}
            </span>
          </li>
          <li>
            <span className="cockpit-runtime__summary-key">Last Startup</span>
            <span className="cockpit-runtime__summary-value">
              {formatWhen(status?.summary.lastStartup ?? null)}
            </span>
          </li>
          <li>
            <span className="cockpit-runtime__summary-key">Current Uptime</span>
            <span className="cockpit-runtime__summary-value">
              {formatUptime(status?.summary.uptimeSeconds ?? null)}
            </span>
          </li>
        </ul>
      </section>

      <section className="cockpit-runtime__section" aria-label="Runtime services">
        <h4 className="cockpit-runtime__section-label">Services</h4>
        <ul className="cockpit-runtime__services">
          {(status?.services ?? []).map((service) => (
            <RuntimeServiceRow key={service.id} service={service} />
          ))}
          {!status ? <li className="cockpit-runtime__muted">Checking services…</li> : null}
        </ul>
      </section>

      <section className="cockpit-runtime__section" aria-label="Live Monitor">
        <h4 className="cockpit-runtime__section-label">Live Monitor</h4>
        <div className="cockpit-runtime__monitor-grid">
          <LiveMonitorColumn title="Local" snapshot={status?.liveMonitor.local ?? null} />
          <LiveMonitorColumn title="Public" snapshot={status?.liveMonitor.public ?? null} />
        </div>
        <p
          className={`cockpit-runtime__sync cockpit-runtime__sync--${
            status?.liveMonitor.sync.inSync ? "ok" : "warn"
          }`}
        >
          {status?.liveMonitor.sync.inSync ? "🟢 IN SYNC" : "🟡 OUT OF SYNC"}
          {status && status.liveMonitor.sync.differences.length > 0
            ? ` · ${status.liveMonitor.sync.differences.join(" · ")}`
            : null}
        </p>
      </section>

      <p className="cockpit-runtime__deployment" aria-live="polite">
        {status?.deployment.message ?? "Checking deployment status…"}
        {status?.deployment.localCommit && status.deployment.productionCommit
          ? ` (${status.deployment.localCommit} local · ${status.deployment.productionCommit} production${
              status.deployment.dirty ? " · uncommitted changes" : ""
            })`
          : null}
      </p>

      <details
        className="cockpit-runtime__diagnostics"
        open={diagnosticsOpen}
        onToggle={(event) => setDiagnosticsOpen((event.target as HTMLDetailsElement).open)}
      >
        <summary>Diagnostics</summary>
        <ul className="cockpit-runtime__monitor-list">
          <li>Bridge reconnect count · {status?.diagnostics.bridgeReconnectCount ?? 0}</li>
          <li>OSC errors · {status?.diagnostics.oscErrors ?? 0}</li>
          <li
            className={
              status?.diagnostics.bridgePublicPush &&
              status.diagnostics.bridgePublicPush.status !== "synced"
                ? "cockpit-runtime__warn"
                : undefined
            }
          >
            Bridge public push ·{" "}
            {status?.diagnostics.bridgePublicPush
              ? `${status.diagnostics.bridgePublicPush.status} · ${status.diagnostics.bridgePublicPush.detail}${
                  status.diagnostics.bridgePublicPush.httpStatus != null
                    ? ` · HTTP ${status.diagnostics.bridgePublicPush.httpStatus}`
                    : ""
                }${
                  status.diagnostics.bridgePublicPush.destination
                    ? ` · ${status.diagnostics.bridgePublicPush.destination}`
                    : ""
                } · ${formatWhen(status.diagnostics.bridgePublicPush.at)}`
              : "No forward attempts yet"}
          </li>
          <li>
            Last deployment · {formatWhen(status?.diagnostics.lastDeploymentTime ?? null)}
          </li>
        </ul>
        <h5 className="cockpit-runtime__diag-heading">Startup log</h5>
        <pre className="cockpit-runtime__log">
          {(status?.diagnostics.startupLog ?? []).join("\n") || "No startup log entries."}
        </pre>
        <h5 className="cockpit-runtime__diag-heading">Health failures</h5>
        <pre className="cockpit-runtime__log">
          {(status?.diagnostics.healthFailures ?? []).join("\n") || "No recorded health failures."}
        </pre>
      </details>

      <ul className="cockpit-panel__metrics cockpit-runtime__meta" aria-label="Runtime details">
        <li>VDJ Bridge · {status?.vdjBridgeRunning ? "Running" : "Stopped"}</li>
        <li>Start bridge · {status?.vdjBridgeCommand ?? "npm run live-now-playing"}</li>
      </ul>

      <div className="cockpit-runtime__transport" aria-label="Runtime transport">
        <button
          type="button"
          className="cockpit-panel__btn cockpit-panel__btn--primary cockpit-runtime__transport-btn"
          onClick={() => void run(runtimeStart)}
          disabled={busy || bothRunning}
        >
          ▶ Start
        </button>
        <button
          type="button"
          className="cockpit-panel__btn cockpit-panel__btn--secondary cockpit-runtime__transport-btn"
          onClick={() => void run(runtimeRestart)}
          disabled={busy}
        >
          ↻ Restart
        </button>
        <button
          type="button"
          className="cockpit-panel__btn cockpit-panel__btn--secondary cockpit-runtime__transport-btn"
          onClick={() => void run(runtimeStop)}
          disabled={busy}
        >
          ■ Stop
        </button>
      </div>

      <div className="cockpit-panel__actions">
        <a
          href="http://localhost:3000"
          target="_blank"
          rel="noopener noreferrer"
          className="cockpit-panel__btn cockpit-panel__btn--secondary"
        >
          Open Studio
        </a>
        <a
          href="http://localhost:3100"
          target="_blank"
          rel="noopener noreferrer"
          className="cockpit-panel__btn cockpit-panel__btn--secondary"
        >
          Open Live
        </a>
      </div>
    </>
  );
}
