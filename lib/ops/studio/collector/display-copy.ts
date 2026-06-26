/** Friendly display copy for Collector UI — no blanks or dashes when idle. */

import type { CollectorDashboardStats, CollectorRunStatus } from "./types";

export function displayCurrentSong(value: string, status: CollectorRunStatus): string {
  if (value && value !== "—") return value;
  if (status === "researching" || status === "waiting") return "Preparing next song…";
  return "No active research";
}

export function displayCurrentStage(value: string, status: CollectorRunStatus): string {
  if (value && value !== "—") return value;
  if (status === "researching") return "Starting up…";
  if (status === "waiting") return "Waiting for work";
  return "Standing by";
}

export function displayResearchQuality(value: string, status: CollectorRunStatus): string {
  if (value && value !== "—") return value;
  if (status === "researching" || status === "waiting") return "In progress";
  return "Not measured yet";
}

export function displayRecentActivity(
  entries: CollectorDashboardStats["recentActivity"],
  status: CollectorRunStatus,
): string {
  if (entries[0]?.message) return entries[0].message;
  if (status === "researching") return "Research in progress…";
  if (status === "waiting") return "Waiting for work";
  if (status === "complete") return "Last run completed";
  return "Collector ready — waiting for the next job";
}

export function displayQueue(value: number, status: CollectorRunStatus): string {
  if (value > 0) return String(value);
  return status === "waiting" ? "Waiting for work" : "Queue empty";
}

export function displayCompletedToday(value: number): string {
  return value > 0 ? String(value) : "None yet today";
}

export function displayAverageTime(value: string, status: CollectorRunStatus): string {
  if (value && value !== "—") return value;
  return status === "idle" ? "No runs yet" : "Measuring…";
}

export function displayStatusLabel(label: string, status: CollectorRunStatus): string {
  if (status === "idle") return "Ready";
  return label;
}

export function hasCollectorWork(stats: CollectorDashboardStats): boolean {
  return (
    stats.status === "researching" ||
    stats.status === "waiting" ||
    stats.status === "complete" ||
    stats.recentlyCompleted.length > 0 ||
    stats.recentActivity.length > 0
  );
}
