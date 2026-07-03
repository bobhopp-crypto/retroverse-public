import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  loadAutomationFactoryModel,
  type AutomationFactoryActivity,
  type VideoFactoryQueueItem,
} from "@/lib/ops/automation-factory/load-automation-factory";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "./automation-factory.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Automation Factory — Retroverse Ops",
  robots: { index: false, follow: false },
};

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function statusClass(value: string): string {
  return `automation-factory__status automation-factory__status--${value}`;
}

function summaryClass(tone: string): string {
  return `automation-factory__summary automation-factory__summary--${tone}`;
}

function packageHref(rvtr: string): string {
  return `/ops/intelligence/package/${rvtr}`;
}

function currentState(item: VideoFactoryQueueItem): string {
  return [
    item.state.matched ? "matched" : "unmatched",
    item.state.package ? "package" : "missing package",
    item.state.deck ? "deck" : "missing deck",
    item.state.cover ? "cover" : "missing cover",
    item.state.thumbnail ? "thumbnail" : "missing thumbnail",
  ].join(" · ");
}

function BacklogTable({ title, items }: { title: string; items: VideoFactoryQueueItem[] }) {
  return (
    <article className="automation-factory-queue-view">
      <div className="automation-factory-queue-view__head">
        <div>
          <p className="automation-factory__kicker">Queue-Derived</p>
          <h3>{title}</h3>
        </div>
        <span>{formatNumber(items.length)} visible</span>
      </div>
      <div className="automation-factory-queue-list">
        {items.length ? (
          items.map((item) => (
            <div key={`${title}-${item.rvtr}`} className="automation-factory-queue-item">
              <strong>{item.rvtr}</strong>
              <span>{item.artist || "Unknown Artist"}</span>
              <em>{item.title || "Untitled"}</em>
              <small>{currentState(item)}</small>
              <div>
                <span>{item.nextWorker}</span>
                <Link href={packageHref(item.rvtr)} prefetch={false}>Package</Link>
              </div>
            </div>
          ))
        ) : (
          <p>No rows in this queue bucket.</p>
        )}
      </div>
    </article>
  );
}

function ActivityRow({ activity }: { activity: AutomationFactoryActivity }) {
  return (
    <div className="automation-factory__activity">
      <span>{formatDate(activity.time)}</span>
      <strong>{activity.worker}</strong>
      <em>{activity.rvtr ? `${activity.rvtr} · ${activity.artist ?? "Unknown"} — ${activity.title ?? "Untitled"}` : "Factory"}</em>
      <b>{activity.event}</b>
      <span className={statusClass(activity.event === "failed" ? "failed" : "info")}>{activity.event}</span>
      <p>{activity.detail}</p>
    </div>
  );
}

export default async function AutomationFactoryPage() {
  if (!isOpsEnabled()) notFound();

  const model = await loadAutomationFactoryModel();
  const currentTitle = model.status.currentRvtr
    ? `${model.status.currentRvtr} · ${model.status.artist ?? "Unknown"} — ${model.status.title ?? "Untitled"}`
    : "No active worker event in loop log";

  return (
    <main className="automation-factory-page">
      <div className="automation-factory-page__top-link">
        <Link href="/ops">← Ops</Link>
      </div>

      <section className="automation-factory">
        <header className="automation-factory__masthead">
          <div>
            <p className="automation-factory__kicker">VIDEO Factory Control Room</p>
            <h1>Automation Factory</h1>
            <p>
              Live operational view of the VIDEO factory. Metrics come from
              `video-work-queue.json`, the active loop log, and current queue-owned assets.
            </p>
          </div>
          <div className="automation-factory__status-board" aria-label="VIDEO factory status summary">
            {model.summary.slice(0, 4).map((metric) => (
              <span key={metric.label} className={summaryClass(metric.tone)}>
                <strong>{formatNumber(metric.value)}</strong>
                {metric.label}
              </span>
            ))}
          </div>
        </header>

        <div className="automation-factory__safety-strip">
          <span>Factory: {model.status.running ? "running" : "not running"}</span>
          <span>PID: {model.status.pid ?? "none"}</span>
          <span>Queue updated: {formatDate(model.diagnostics.queueLastUpdated)}</span>
          <span>Generated: {formatDate(model.generatedAt)}</span>
        </div>

        <section className="automation-factory__section automation-factory__section--primary automation-factory__section--next">
          <div className="automation-factory__section-head">
            <div>
              <p className="automation-factory__kicker">Live Worker Status</p>
              <h2>Current Factory Work</h2>
            </div>
            <span className="automation-factory__badge">{model.status.running ? "active" : "offline"}</span>
          </div>

          <div className="automation-factory-snapshot">
            <article>
              <span>Current Worker</span>
              <strong>{model.status.currentWorker ?? "None"}</strong>
            </article>
            <article>
              <span>Current RVTR</span>
              <strong>{currentTitle}</strong>
            </article>
          </div>

          <div className="automation-factory-next-actions">
            <article className="automation-factory-next-action">
              <h3>{model.status.running ? "Loop Running" : "Loop Not Running"}</h3>
              <p>{model.status.reason}</p>
              <dl>
                <div>
                  <dt>Started</dt>
                  <dd>{model.status.started ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt>Last Activity</dt>
                  <dd>{formatDate(model.status.lastActivityAt)}</dd>
                </div>
              </dl>
              <a href="#activity-feed">Open Activity</a>
            </article>
            <article className="automation-factory-next-action">
              <h3>Throughput Today</h3>
              <p>Computed from queue deltas and VIDEO factory worker log lines.</p>
              <dl>
                <div>
                  <dt>Packages</dt>
                  <dd>{formatNumber(model.throughput.packagesCompletedToday)}</dd>
                </div>
                <div>
                  <dt>Decks</dt>
                  <dd>{formatNumber(model.throughput.decksPromotedToday)}</dd>
                </div>
                <div>
                  <dt>Covers</dt>
                  <dd>{formatNumber(model.throughput.coversRecoveredToday)}</dd>
                </div>
                <div>
                  <dt>Queue Reduction</dt>
                  <dd>{formatNumber(model.throughput.queueReductionToday)}</dd>
                </div>
              </dl>
              <a href="#diagnostics">Diagnostics</a>
            </article>
            <article className="automation-factory-next-action">
              <h3>Bottlenecks</h3>
              <p>Actual queue-state blockers for the VIDEO factory.</p>
              <dl>
                <div>
                  <dt>Deck Failures / Missing</dt>
                  <dd>{formatNumber(model.bottlenecks.deckPromotionFailures)}</dd>
                </div>
                <div>
                  <dt>Cover Failures / Missing</dt>
                  <dd>{formatNumber(model.bottlenecks.coverRecoveryFailures)}</dd>
                </div>
                <div>
                  <dt>Thumbnail Backlog</dt>
                  <dd>{formatNumber(model.bottlenecks.thumbnailBacklog)}</dd>
                </div>
                <div>
                  <dt>Identity Backlog</dt>
                  <dd>{formatNumber(model.bottlenecks.identityBacklog)}</dd>
                </div>
              </dl>
              <a href="#backlogs">Open Backlogs</a>
            </article>
          </div>
        </section>

        <section className="automation-factory__section">
          <div className="automation-factory__section-head">
            <div>
              <p className="automation-factory__kicker">Queue Counts</p>
              <h2>VIDEO Factory Summary</h2>
            </div>
            <span className="automation-factory__badge">video-work-queue.json</span>
          </div>
          <div className="automation-factory__queue-grid">
            {model.summary.map((metric) => (
              <article key={metric.label} className="automation-factory__queue-bucket">
                <span>{metric.label}</span>
                <strong>{formatNumber(metric.value)}</strong>
                <em>queue-derived</em>
              </article>
            ))}
          </div>
        </section>

        <section id="backlogs" className="automation-factory__section">
          <div className="automation-factory__section-head">
            <div>
              <p className="automation-factory__kicker">Asset Backlog Views</p>
              <h2>Queue-Derived Work</h2>
            </div>
            <span className="automation-factory__badge">first 24 per bucket</span>
          </div>
          <div className="automation-factory-queue-views">
            <BacklogTable title="Missing Packages" items={model.backlog.missingPackages} />
            <BacklogTable title="Missing Decks" items={model.backlog.missingDecks} />
            <BacklogTable title="Missing Covers" items={model.backlog.missingCovers} />
            <BacklogTable title="Missing Thumbnails" items={model.backlog.missingThumbnails} />
          </div>
        </section>

        <section id="activity-feed" className="automation-factory__section">
          <div className="automation-factory__section-head">
            <div>
              <p className="automation-factory__kicker">Current Worker Activity</p>
              <h2>Factory Events</h2>
            </div>
            <span className="automation-factory__badge">loop log only</span>
          </div>
          <div className="automation-factory__activity-feed">
            {model.activity.length === 0 ? (
              <p>No VIDEO factory loop events found in the current log.</p>
            ) : (
              model.activity.map((activity, index) => (
                <ActivityRow key={`${activity.worker}-${activity.event}-${index}`} activity={activity} />
              ))
            )}
          </div>
        </section>

        <section id="diagnostics" className="automation-factory__section">
          <div className="automation-factory__section-head">
            <div>
              <p className="automation-factory__kicker">Diagnostics</p>
              <h2>Queue Authority</h2>
            </div>
            <span className="automation-factory__badge">live sources</span>
          </div>
          <div className="automation-factory__source-table">
            <div className="automation-factory__source-row">
              <strong>Queue file</strong>
              <span className={statusClass("idle")}>available</span>
              <code>{model.diagnostics.queuePath}</code>
              <em>{formatDate(model.diagnostics.queueLastUpdated)}</em>
              <span>primary authority</span>
            </div>
            <div className="automation-factory__source-row">
              <strong>Factory loop</strong>
              <span className={statusClass(model.diagnostics.factoryLoopStatus === "running" ? "running" : "unknown")}>
                {model.diagnostics.factoryLoopStatus}
              </span>
              <code>npm run video-factory:loop</code>
              <em>{model.status.started ?? "not running"}</em>
              <span>PID {model.status.pid ?? "none"}</span>
            </div>
            <div className="automation-factory__source-row">
              <strong>Current log file</strong>
              <span className={statusClass(model.diagnostics.logAvailable ? "idle" : "unknown")}>
                {model.diagnostics.logAvailable ? "available" : "missing"}
              </span>
              <code>{model.diagnostics.currentLogFile}</code>
              <em>{formatDate(model.status.lastActivityAt)}</em>
              <span>worker events only</span>
            </div>
            <div className="automation-factory__source-row">
              <strong>Package folder count</strong>
              <span className={statusClass("info")}>counted</span>
              <code>RETROVERSE_DATA/ops/intelligence/packages</code>
              <em>{formatNumber(model.diagnostics.packageFolderCount)}</em>
              <span>diagnostic count</span>
            </div>
            <div className="automation-factory__source-row">
              <strong>Deck index count</strong>
              <span className={statusClass("info")}>counted</span>
              <code>data/ops/intelligence/deck-index.json</code>
              <em>{formatNumber(model.diagnostics.deckIndexCount)}</em>
              <span>diagnostic count</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
