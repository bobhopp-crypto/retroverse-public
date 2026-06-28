import "server-only";

export type PipelineTransitionId =
  | "collector_complete"
  | "editor_queued"
  | "editor_started"
  | "editor_complete"
  | "director_queued"
  | "director_started"
  | "director_complete"
  | "publisher_queued"
  | "publisher_started"
  | "publisher_complete"
  | "published";

export type PipelineTransition = {
  id: PipelineTransitionId;
  at: string;
  runtimeMs?: number;
  detail?: string;
};

export class PipelineTransitionLog {
  readonly rvtr: string;
  readonly transitions: PipelineTransition[] = [];

  constructor(rvtr: string) {
    this.rvtr = rvtr.trim().toUpperCase();
  }

  mark(id: PipelineTransitionId, options?: { runtimeMs?: number; detail?: string }): void {
    this.transitions.push({
      id,
      at: new Date().toISOString(),
      runtimeMs: options?.runtimeMs,
      detail: options?.detail,
    });
  }

  formatLine(): string {
    const labels: Record<PipelineTransitionId, string> = {
      collector_complete: "Collector ✓",
      editor_queued: "Editor queued",
      editor_started: "Editor started",
      editor_complete: "Editor ✓",
      director_queued: "Director queued",
      director_started: "Director started",
      director_complete: "Director ✓",
      publisher_queued: "Publisher queued",
      publisher_started: "Publisher started",
      publisher_complete: "Publisher ✓",
      published: "Published",
    };

    return [
      this.rvtr,
      ...this.transitions.map((t) => {
        const base = labels[t.id] ?? t.id;
        if (t.runtimeMs != null) {
          return `${base} (${(t.runtimeMs / 1000).toFixed(1)}s)`;
        }
        if (t.detail) return `${base} — ${t.detail}`;
        return base;
      }),
    ].join("\n");
  }
}

export function formatTransitionAudit(entries: Array<{ rvtr: string; log: PipelineTransitionLog }>): string {
  return entries.map((e) => e.log.formatLine()).join("\n\n");
}
