"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type JobRow = {
  id: string;
  type: string;
  status: string;
  title: string;
  thumbnailUrl: string | null;
  progress: { current: number; total: number; step: string };
  elapsedMs: number;
  error: string | null;
  result: { runId?: string; batchId?: string } | null;
};

type QueueState = {
  generating: JobRow[];
  waiting: JobRow[];
  completed: JobRow[];
  failed: JobRow[];
};

function formatElapsed(ms: number): string {
  if (ms < 1000) return "<1s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function JobCard({ job }: { job: JobRow }) {
  const pct = job.progress.total > 0 ? Math.round((job.progress.current / job.progress.total) * 100) : 0;
  const href =
    job.result?.batchId
      ? `/ops/content-creator?batch=${encodeURIComponent(job.result.batchId)}`
      : job.result?.runId
        ? `/ops/content-creator/create?runId=${encodeURIComponent(job.result.runId)}`
        : null;

  return (
    <div className="cc-job">
      <div className="cc-job__thumb">
        {job.thumbnailUrl ? (
          <img src={job.thumbnailUrl} alt="" />
        ) : (
          <span className="cc-job__thumb-placeholder" aria-hidden />
        )}
      </div>
      <div className="cc-job__body">
        <p className="cc-job__title">{job.title}</p>
        <p className="cc-job__step">{job.progress.step}</p>
        {job.status === "running" || job.status === "queued" ? (
          <div className="cc-job__bar" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
        ) : null}
        <p className="cc-job__meta">
          {formatElapsed(job.elapsedMs)}
          {job.error ? ` · ${job.error}` : ""}
        </p>
        {href ? (
          <Link href={href} className="cc-job__link">
            Open result
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function JobQueuePanel() {
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/ops/content-creator/jobs");
      const data = (await res.json()) as QueueState & { ok?: boolean };
      if (res.ok) setQueue(data);
    } catch {
      // ignore poll errors
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 3000);
    return () => clearInterval(t);
  }, [load]);

  const active = (queue?.generating.length ?? 0) + (queue?.waiting.length ?? 0);
  const hasAny =
    active > 0 ||
    (queue?.completed.length ?? 0) > 0 ||
    (queue?.failed.length ?? 0) > 0;

  if (!hasAny) return null;

  return (
    <aside className={`cc-queue${open ? " is-open" : ""}`} aria-label="Generation queue">
      <button type="button" className="cc-queue__toggle" onClick={() => setOpen((v) => !v)}>
        Queue{active > 0 ? ` (${active} active)` : ""}
      </button>
      {open ? (
        <div className="cc-queue__panels">
          {queue?.generating.length ? (
            <section>
              <h3>Generating</h3>
              {queue.generating.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </section>
          ) : null}
          {queue?.waiting.length ? (
            <section>
              <h3>Waiting</h3>
              {queue.waiting.map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </section>
          ) : null}
          {queue?.completed.length ? (
            <section>
              <h3>Completed</h3>
              {queue.completed.slice(0, 4).map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </section>
          ) : null}
          {queue?.failed.length ? (
            <section>
              <h3>Failed</h3>
              {queue.failed.slice(0, 3).map((j) => (
                <JobCard key={j.id} job={j} />
              ))}
            </section>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
