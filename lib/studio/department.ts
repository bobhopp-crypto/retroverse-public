/** Retroverse Studio Kernel — department registry and ownership boundaries. */

/** UI-facing department identifiers (Studio shell pages). */
export type StudioDepartmentId =
  | "collector"
  | "editor"
  | "director"
  | "publisher"
  | "visual-analysis"
  | "audio-analysis"
  | "quality-control";

/** Kernel infrastructure departments (not all have Studio UI pages yet). */
export type StudioKernelDepartmentId = StudioDepartmentId | "ai" | "scheduler";

export type DepartmentBoundary = {
  /** Short rule enforced by architecture — not runtime-enforced in Phase 0. */
  never: string[];
};

export type StudioDepartmentPlaceholders = {
  status: string;
  currentJob: string;
  queue: number;
  completedToday: number;
  averageTime: string;
  coverage: string;
};

export type StudioDepartment = {
  id: StudioDepartmentId;
  slug: string;
  name: string;
  mission: string;
  icon: string;
  available: boolean;
  href: string;
  openLabel: string;
  placeholders: StudioDepartmentPlaceholders;
};

/** Ownership rules — departments communicate via jobs, not direct calls (target state). */
export const DEPARTMENT_BOUNDARIES: Record<StudioKernelDepartmentId, DepartmentBoundary> = {
  collector: { never: ["edit packages", "approve", "publish"] },
  editor: { never: ["external research", "approve for publish", "publish"] },
  director: { never: ["create content", "external research", "publish"] },
  publisher: { never: ["edit packages", "external research"] },
  "visual-analysis": { never: ["edit story packages", "publish"] },
  "audio-analysis": { never: ["edit story packages", "publish"] },
  "quality-control": { never: ["create content", "publish"] },
  ai: { never: ["business logic", "direct queue drain without Scheduler"] },
  scheduler: { never: ["business logic", "package mutation"] },
};

const DEFAULT_PLACEHOLDERS: StudioDepartmentPlaceholders = {
  status: "Not Running",
  currentJob: "—",
  queue: 0,
  completedToday: 0,
  averageTime: "—",
  coverage: "—",
};

export const STUDIO_DEPARTMENTS: StudioDepartment[] = [
  {
    id: "collector",
    slug: "collector",
    name: "Collector",
    mission: "Gathers source material and research for every song story.",
    icon: "📚",
    available: true,
    href: "/ops/studio/collector",
    openLabel: "Open Collector",
    placeholders: { ...DEFAULT_PLACEHOLDERS },
  },
  {
    id: "editor",
    slug: "editor",
    name: "Editor",
    mission: "Transforms Collector research into polished, editable story packages.",
    icon: "✏️",
    available: true,
    href: "/ops/studio/editor",
    openLabel: "Open Editor",
    placeholders: { ...DEFAULT_PLACEHOLDERS },
  },
  {
    id: "director",
    slug: "director",
    name: "Director",
    mission: "Designs the patron experience — flow, chapters, and reveal.",
    icon: "🎬",
    available: true,
    href: "/ops/studio/director",
    openLabel: "Open Director",
    placeholders: { ...DEFAULT_PLACEHOLDERS },
  },
  {
    id: "publisher",
    slug: "publisher",
    name: "Publisher",
    mission: "Prepares finished work for the public exhibit.",
    icon: "📰",
    available: true,
    href: "/ops/studio/publisher",
    openLabel: "Open Publisher",
    placeholders: { ...DEFAULT_PLACEHOLDERS },
  },
  {
    id: "visual-analysis",
    slug: "visual-analysis",
    name: "Visual Analysis",
    mission: "Understands artwork, video, and visual identity.",
    icon: "👁",
    available: false,
    href: "/ops/studio/visual-analysis",
    openLabel: "Open Visual Analysis",
    placeholders: { ...DEFAULT_PLACEHOLDERS },
  },
  {
    id: "audio-analysis",
    slug: "audio-analysis",
    name: "Audio Analysis",
    mission: "Listens for energy, tempo, and performance class.",
    icon: "🎧",
    available: false,
    href: "/ops/studio/audio-analysis",
    openLabel: "Open Audio Analysis",
    placeholders: { ...DEFAULT_PLACEHOLDERS },
  },
  {
    id: "quality-control",
    slug: "quality-control",
    name: "Quality Control",
    mission: "Final review before anything goes live.",
    icon: "✓",
    available: false,
    href: "/ops/studio/quality-control",
    openLabel: "Open Quality Control",
    placeholders: { ...DEFAULT_PLACEHOLDERS },
  },
];

export const STUDIO_ACTIVE = STUDIO_DEPARTMENTS.filter((d) => d.available);
export const STUDIO_COMING_SOON = STUDIO_DEPARTMENTS.filter((d) => !d.available);

export function getStudioDepartment(slug: string): StudioDepartment | undefined {
  return STUDIO_DEPARTMENTS.find((d) => d.slug === slug);
}

export function getDepartmentBoundary(id: StudioKernelDepartmentId): DepartmentBoundary {
  return DEPARTMENT_BOUNDARIES[id];
}
