/** Timestamped startup phases for production CLI — no React keys, no side effects. */

export type StartupPhase = {
  label: string;
  elapsedMs: number;
  deltaMs: number;
};

export class StartupProfiler {
  private readonly startedAt = Date.now();
  private lastMark = this.startedAt;
  readonly phases: StartupPhase[] = [];

  mark(label: string): void {
    const now = Date.now();
    const deltaMs = now - this.lastMark;
    this.phases.push({
      label,
      elapsedMs: now - this.startedAt,
      deltaMs,
    });
    this.lastMark = now;
    console.log(`[startup +${now - this.startedAt}ms] ${label}`);
    if (deltaMs > 2000) {
      console.warn(`[startup] SLOW PHASE (${deltaMs}ms): ${label}`);
    }
  }

  warnSlowPhases(thresholdMs = 2000): StartupPhase[] {
    return this.phases.filter((p) => p.deltaMs > thresholdMs);
  }
}
