"use client";

import type { Bp2ProductionHealth } from "@/lib/ops/browser-plus-2/types";

import { GuideTooltip } from "@/components/ops/studio/operator-guide";

type Props = {
  health: Bp2ProductionHealth;
};

export function StudioHealthDashboard({ health }: Props) {
  const cards: Array<{
    metricId: string;
    label: string;
    value: string;
    detail: string;
  }> = [
    {
      metricId: "collectorCoverage",
      label: "Collector Coverage",
      value: `${health.collectorCoveragePct}%`,
      detail: `${health.identifiedVideos} identified videos`,
    },
    {
      metricId: "editorCoverage",
      label: "Editor Coverage",
      value: `${health.editorCoveragePct}%`,
      detail: "Packages with editor artifact",
    },
    {
      metricId: "directorCoverage",
      label: "Director Coverage",
      value: `${health.directorCoveragePct}%`,
      detail: "Packages with director artifact",
    },
    {
      metricId: "renderReady",
      label: "Render Ready",
      value: `${health.renderReadyCount.toLocaleString()}`,
      detail: `${health.renderReadyPct}% of library`,
    },
    {
      metricId: "avgPatronValue",
      label: "Avg Patron Value",
      value: health.avgPatronValue !== null ? String(health.avgPatronValue) : "—",
      detail: "Across scored packages",
    },
    {
      metricId: "avgConfidence",
      label: "Avg Confidence",
      value: health.avgConfidence !== null ? String(health.avgConfidence) : "—",
      detail: "1=Early · 4=Strong",
    },
    {
      metricId: "needsAttention",
      label: "Needs Attention",
      value: health.needingAttention.toLocaleString(),
      detail: "Review, missing items, or blocked",
    },
    {
      metricId: "productionReady",
      label: "Production Ready",
      value: health.readyToPublish.toLocaleString(),
      detail: "Ready to publish",
    },
    {
      metricId: "queueWaiting",
      label: "Queue · Waiting",
      value: health.queueWaiting.toLocaleString(),
      detail: health.queuePausedGlobal ? "Queue paused" : "Jobs queued",
    },
    {
      metricId: "queueRunning",
      label: "Queue · Running",
      value: health.queueRunning.toLocaleString(),
      detail: `${health.queueCompleted24h} done · ${health.queueFailed24h} failed (24h)`,
    },
    {
      metricId: "workerStatus",
      label: "Workers",
      value: `${health.workersWorking} working`,
      detail: `${health.workersReady} ready · ${health.workersOffline} offline`,
    },
    {
      metricId: "queueBlocked",
      label: "AI Engines",
      value: `${health.aiEnginesUp}/${health.aiEnginesTotal}`,
      detail: health.aiEnginesUp === health.aiEnginesTotal ? "All online" : "Check attention list",
    },
  ];

  return (
    <section className="bp2__studio-health" aria-label="Production health" data-guide="production-health">
      <h2 className="bp2__studio-health-title">Production Health</h2>
      <div className="bp2__studio-health-grid">
        {cards.map((card) => (
          <div key={card.metricId} className="bp2__studio-health-card">
            <strong className="bp2__studio-health-value">{card.value}</strong>
            <GuideTooltip metricId={card.metricId}>
              <span className="bp2__studio-health-label">{card.label}</span>
            </GuideTooltip>
            <span className="bp2__studio-health-detail">{card.detail}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
