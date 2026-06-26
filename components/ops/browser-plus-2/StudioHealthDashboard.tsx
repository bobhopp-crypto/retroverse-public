"use client";

import type { Bp2ProductionHealth } from "@/lib/ops/browser-plus-2/types";

type Props = {
  health: Bp2ProductionHealth;
};

export function StudioHealthDashboard({ health }: Props) {
  const cards = [
    {
      label: "Collector Coverage",
      value: `${health.collectorCoveragePct}%`,
      detail: `${health.identifiedVideos} identified videos`,
    },
    {
      label: "Editor Coverage",
      value: `${health.editorCoveragePct}%`,
      detail: "Packages with editor artifact",
    },
    {
      label: "Director Coverage",
      value: `${health.directorCoveragePct}%`,
      detail: "Packages with director artifact",
    },
    {
      label: "Render Ready",
      value: `${health.renderReadyCount.toLocaleString()}`,
      detail: `${health.renderReadyPct}% of library`,
    },
    {
      label: "Avg Patron Value",
      value: health.avgPatronValue !== null ? String(health.avgPatronValue) : "—",
      detail: "Across scored packages",
    },
    {
      label: "Avg Confidence",
      value: health.avgConfidence !== null ? String(health.avgConfidence) : "—",
      detail: "1=Early · 4=Strong",
    },
    {
      label: "Needs Attention",
      value: health.needingAttention.toLocaleString(),
      detail: "Review, missing items, or blocked",
    },
    {
      label: "Production Ready",
      value: health.readyToPublish.toLocaleString(),
      detail: "Ready to publish",
    },
    {
      label: "Queue · Waiting",
      value: health.queueWaiting.toLocaleString(),
      detail: health.queuePausedGlobal ? "Queue paused" : "Jobs queued",
    },
    {
      label: "Queue · Running",
      value: health.queueRunning.toLocaleString(),
      detail: `${health.queueCompleted24h} done · ${health.queueFailed24h} failed (24h)`,
    },
    {
      label: "Workers",
      value: `${health.workersWorking} working`,
      detail: `${health.workersReady} ready · ${health.workersOffline} offline`,
    },
    {
      label: "AI Engines",
      value: `${health.aiEnginesUp}/${health.aiEnginesTotal}`,
      detail: health.aiEnginesUp === health.aiEnginesTotal ? "All online" : "Check attention list",
    },
  ];

  return (
    <section className="bp2__studio-health" aria-label="Production health">
      <h2 className="bp2__studio-health-title">Production Health</h2>
      <div className="bp2__studio-health-grid">
        {cards.map((card) => (
          <div key={card.label} className="bp2__studio-health-card">
            <strong className="bp2__studio-health-value">{card.value}</strong>
            <span className="bp2__studio-health-label">{card.label}</span>
            <span className="bp2__studio-health-detail">{card.detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
