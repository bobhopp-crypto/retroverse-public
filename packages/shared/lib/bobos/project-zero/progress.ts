import type { Project } from "./types";

export function projectProgress(project: Project): { done: number; total: number; percent: number } {
  const total = project.workspaces.length;
  const done = project.workspaces.filter((w) => w.status === "DONE").length;
  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

/** Derived, not stored — mirrors the existing production-binder checklist pattern. */
export function projectStatusSummary(project: Project): string {
  const { done, total } = projectProgress(project);
  if (total === 0) return "No workspaces yet";
  if (done === total) return "All done";
  const needsAttention = project.workspaces.filter((w) => w.status === "NEEDS_ATTENTION").length;
  if (needsAttention > 0) {
    return `${needsAttention} need${needsAttention === 1 ? "s" : ""} attention`;
  }
  return `${done} of ${total} done`;
}

export function projectNextAction(project: Project): string {
  const next = project.workspaces.find((w) => w.status !== "DONE");
  return next ? `Open ${next.title}` : "All workspaces done";
}
