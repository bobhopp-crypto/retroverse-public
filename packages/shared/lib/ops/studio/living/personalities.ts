import type { LivingDepartmentId } from "./types";

export const DEPARTMENT_PERSONALITIES: Record<
  LivingDepartmentId,
  { atmosphere: string; idleActivities: string[]; workingActivities: string[]; emptyMessage: string }
> = {
  collector: {
    atmosphere: "Research archive · Source gathering",
    idleActivities: [
      "Indexing chart history…",
      "Locating artwork and credits…",
      "Cross-referencing sources…",
      "Cataloguing media references…",
    ],
    workingActivities: [
      "Gathering metadata…",
      "Verifying chart sources…",
      "Collecting artwork…",
      "Indexing VirtualDJ media…",
    ],
    emptyMessage: "No songs waiting for research.",
  },
  editor: {
    atmosphere: "Data desk · Canonical cleanup",
    idleActivities: [
      "Reviewing fact duplicates…",
      "Checking name normalization…",
      "Scanning date formatting…",
      "Flagging unresolved conflicts…",
    ],
    workingActivities: [
      "Merging equivalent facts…",
      "Normalizing names and dates…",
      "Resolving formatting…",
      "Building clean dataset…",
    ],
    emptyMessage: "All datasets are clean and handed off.",
  },
  director: {
    atmosphere: "Experience design · Blueprint floor",
    idleActivities: [
      "Reviewing experience options…",
      "Planning Story and Timeline pages…",
      "Sequencing DNA and Chart views…",
    ],
    workingActivities: [
      "Designing Story page…",
      "Building Timeline…",
      "Planning Song DNA…",
      "Sequencing experience flow…",
    ],
    emptyMessage: "Waiting for a clean dataset from Editor.",
  },
  publisher: {
    atmosphere: "Publishing floor · Live export",
    idleActivities: [
      "Checking publish readiness…",
      "Building page indexes…",
      "Preparing search export…",
    ],
    workingActivities: [
      "Building final assets…",
      "Publishing pages…",
      "Updating search indexes…",
      "Marking package live…",
    ],
    emptyMessage: "No approved experiences awaiting publish.",
  },
};

export const DIRECTOR_EXHIBIT_STEPS = [
  { id: "cover", label: "Selecting Cover" },
  { id: "chart_journey", label: "Building Chart Journey" },
  { id: "iconic_moment", label: "Choosing Iconic Moment" },
  { id: "performance_frames", label: "Comparing Performance Frames" },
  { id: "song_dna", label: "Building Song DNA" },
  { id: "render", label: "Rendering Museum Experience" },
] as const;

export function pickRotatingActivity(
  pool: string[],
  seed: number,
): string {
  if (pool.length === 0) return "Standing by…";
  return pool[Math.abs(seed) % pool.length];
}

export function formatActivityTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
