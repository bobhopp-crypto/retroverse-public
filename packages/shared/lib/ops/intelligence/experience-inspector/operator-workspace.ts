/**
 * RV04-03 Phase 2 — operator workspace derivations.
 * Presentation-only. Deterministic from inventory statuses. No AI.
 */

import type {
  ExperienceInventory,
  ExperienceInventorySection,
  InventorySectionStatus,
} from "./types";

export type HealthTone = "green" | "yellow" | "orange" | "red";

export type ExperienceHealthStatement = {
  id: string;
  tone: HealthTone;
  /** Operator-facing line, e.g. "Identity Complete" */
  label: string;
  /** Explainable inventory basis (never AI). */
  explanation: string;
};

export type RecommendedAction = {
  id: string;
  priority: number;
  label: string;
  reason: string;
  sectionId: string;
  sectionLabel: string;
  sectionStatus: InventorySectionStatus;
};

export type SongWorkspaceBadges = {
  canonical: boolean;
  virtualDj: boolean;
  published: boolean;
  packageReady: boolean;
};

function byId(
  sections: ExperienceInventorySection[],
  id: string,
): ExperienceInventorySection | undefined {
  return sections.find((section) => section.id === id);
}

function statusOf(
  sections: ExperienceInventorySection[],
  id: string,
): InventorySectionStatus | null {
  return byId(sections, id)?.status ?? null;
}

function allAvailable(
  sections: ExperienceInventorySection[],
  ids: readonly string[],
): boolean {
  return ids.every((id) => statusOf(sections, id) === "available");
}

function anyStatus(
  sections: ExperienceInventorySection[],
  ids: readonly string[],
  statuses: readonly InventorySectionStatus[],
): boolean {
  return ids.some((id) => {
    const status = statusOf(sections, id);
    return status != null && statuses.includes(status);
  });
}

function countAvailable(
  sections: ExperienceInventorySection[],
  ids: readonly string[],
): { available: number; total: number } {
  let available = 0;
  let total = 0;
  for (const id of ids) {
    const status = statusOf(sections, id);
    if (status == null || status === "not-applicable") continue;
    total += 1;
    if (status === "available") available += 1;
  }
  return { available, total };
}

function listMissingLabels(
  sections: ExperienceInventorySection[],
  ids: readonly string[],
): string[] {
  return ids
    .map((id) => byId(sections, id))
    .filter(
      (section): section is ExperienceInventorySection =>
        !!section &&
        (section.status === "missing" ||
          section.status === "empty" ||
          section.status === "error"),
    )
    .map((section) => section.label);
}

const IDENTITY_CORE = ["canonical-song", "artist", "album", "year"] as const;
const PUBLIC_PACKAGE_CORE = [
  "story",
  "song-package",
  "public-experience",
  "public-exhibit",
] as const;
const VISUAL_CORE = [
  "canonical-artwork",
  "hero-artwork",
  "visual-library",
  "youtube-references",
  "media-library",
] as const;
const RESEARCH_CORE = [
  "candidate-stories",
  "research-vault",
  "director-pilot",
] as const;
const BROADCAST_CORE = [
  "now-playing-package",
  "publisher-record",
  "artifact-readiness",
] as const;

/** Derive Experience Health lines from inventory section statuses only. */
export function deriveExperienceHealth(
  sections: ExperienceInventorySection[],
): ExperienceHealthStatement[] {
  const statements: ExperienceHealthStatement[] = [];

  // Identity
  if (anyStatus(sections, IDENTITY_CORE, ["error"])) {
    statements.push({
      id: "identity",
      tone: "red",
      label: "Identity Review Required",
      explanation: `Error in: ${listMissingLabels(sections, IDENTITY_CORE).join(", ") || "identity sections"}`,
    });
  } else if (allAvailable(sections, IDENTITY_CORE)) {
    statements.push({
      id: "identity",
      tone: "green",
      label: "Identity Complete",
      explanation: "Canonical song, artist, album, and year are available.",
    });
  } else {
    statements.push({
      id: "identity",
      tone: "yellow",
      label: "Identity Incomplete",
      explanation: `Missing or empty: ${listMissingLabels(sections, IDENTITY_CORE).join(", ") || "identity fields"}`,
    });
  }

  // Public package
  const publicReady =
    statusOf(sections, "story") === "available" &&
    (statusOf(sections, "song-package") === "available" ||
      statusOf(sections, "public-experience") === "available" ||
      statusOf(sections, "public-exhibit") === "available");
  if (anyStatus(sections, PUBLIC_PACKAGE_CORE, ["error"])) {
    statements.push({
      id: "public-package",
      tone: "red",
      label: "Public Package Review Required",
      explanation: `Error in: ${listMissingLabels(sections, PUBLIC_PACKAGE_CORE).join(", ")}`,
    });
  } else if (publicReady) {
    statements.push({
      id: "public-package",
      tone: "green",
      label: "Public Package Ready",
      explanation:
        "Story is available and at least one of song package, public experience, or public exhibit exists.",
    });
  } else {
    statements.push({
      id: "public-package",
      tone: "yellow",
      label: "Public Package Incomplete",
      explanation: `Needs attention: ${listMissingLabels(sections, PUBLIC_PACKAGE_CORE).join(", ") || "public package sections"}`,
    });
  }

  // Visual assets
  const visual = countAvailable(sections, VISUAL_CORE);
  if (anyStatus(sections, VISUAL_CORE, ["error"])) {
    statements.push({
      id: "visuals",
      tone: "red",
      label: "Visual Assets Review Required",
      explanation: `Error in: ${listMissingLabels(sections, VISUAL_CORE).join(", ")}`,
    });
  } else if (visual.total > 0 && visual.available === visual.total) {
    statements.push({
      id: "visuals",
      tone: "green",
      label: "Visual Assets Complete",
      explanation: `${visual.available}/${visual.total} core visual sections available.`,
    });
  } else {
    statements.push({
      id: "visuals",
      tone: "yellow",
      label: "Visual Assets Incomplete",
      explanation: `${visual.available}/${visual.total} available. Gaps: ${
        listMissingLabels(sections, VISUAL_CORE).join(", ") || "visual sections"
      }`,
    });
  }

  // Research
  if (anyStatus(sections, RESEARCH_CORE, ["error"])) {
    statements.push({
      id: "research",
      tone: "red",
      label: "Research Review Required",
      explanation: `Error in: ${listMissingLabels(sections, RESEARCH_CORE).join(", ")}`,
    });
  } else if (allAvailable(sections, RESEARCH_CORE)) {
    statements.push({
      id: "research",
      tone: "green",
      label: "Research Complete",
      explanation: "Candidate stories, research vault, and director pilot are available.",
    });
  } else if (anyStatus(sections, RESEARCH_CORE, ["missing", "empty"])) {
    statements.push({
      id: "research",
      tone: "orange",
      label: "Research Needs Attention",
      explanation: `Missing or empty: ${listMissingLabels(sections, RESEARCH_CORE).join(", ")}`,
    });
  } else {
    statements.push({
      id: "research",
      tone: "yellow",
      label: "Research Incomplete",
      explanation: "Research sections are not fully available.",
    });
  }

  // Broadcast
  if (anyStatus(sections, BROADCAST_CORE, ["error"])) {
    statements.push({
      id: "broadcast",
      tone: "red",
      label: "Broadcast Review Required",
      explanation: `Error in: ${listMissingLabels(sections, BROADCAST_CORE).join(", ")}`,
    });
  } else if (allAvailable(sections, BROADCAST_CORE)) {
    statements.push({
      id: "broadcast",
      tone: "green",
      label: "Broadcast Ready",
      explanation: "Now-playing package, publisher record, and artifact readiness are available.",
    });
  } else if (anyStatus(sections, BROADCAST_CORE, ["missing", "empty"])) {
    statements.push({
      id: "broadcast",
      tone: "red",
      label: "Broadcast Review Required",
      explanation: `Missing or empty: ${listMissingLabels(sections, BROADCAST_CORE).join(", ")}`,
    });
  } else {
    statements.push({
      id: "broadcast",
      tone: "orange",
      label: "Broadcast Needs Attention",
      explanation: "Broadcast package sections are not fully ready.",
    });
  }

  return statements;
}

type ActionRule = {
  id: string;
  priority: number;
  label: string;
  sectionId: string;
  when: readonly InventorySectionStatus[];
  reason: (section: ExperienceInventorySection) => string;
};

/**
 * Deterministic next-action rules.
 * Create/generate only when the asset is missing or empty.
 * Review only when candidates already exist.
 */
const ACTION_RULES: readonly ActionRule[] = [
  {
    id: "create-public-exhibit",
    priority: 10,
    label: "Create Public Exhibit",
    sectionId: "public-exhibit",
    when: ["missing", "empty"],
    reason: (s) => `Public exhibit is ${s.status}.`,
  },
  {
    id: "create-public-experience",
    priority: 20,
    label: "Create Public Experience",
    sectionId: "public-experience",
    when: ["missing", "empty"],
    reason: (s) => `Public experience package is ${s.status}.`,
  },
  {
    id: "add-story",
    priority: 30,
    label: "Add Story Content",
    sectionId: "story",
    when: ["missing", "empty"],
    reason: (s) => `Story is ${s.status}.`,
  },
  {
    id: "add-youtube-references",
    priority: 40,
    label: "Add YouTube References",
    sectionId: "youtube-references",
    when: ["missing", "empty"],
    reason: (s) => `YouTube references are ${s.status}.`,
  },
  {
    id: "generate-visual-library",
    priority: 50,
    label: "Generate Visual Library",
    sectionId: "visual-library",
    when: ["missing", "empty"],
    reason: (s) => `Visual library is ${s.status}.`,
  },
  {
    id: "add-hero-artwork",
    priority: 60,
    label: "Add Hero Artwork",
    sectionId: "hero-artwork",
    when: ["missing", "empty"],
    reason: (s) => `Hero artwork is ${s.status}.`,
  },
  {
    id: "review-candidate-stories",
    priority: 70,
    label: "Review Candidate Stories",
    sectionId: "candidate-stories",
    when: ["available"],
    reason: (s) =>
      s.count != null
        ? `${s.count} candidate stor${s.count === 1 ? "y" : "ies"} available for review.`
        : "Candidate stories are available for review.",
  },
  {
    id: "collect-candidate-stories",
    priority: 75,
    label: "Collect Candidate Stories",
    sectionId: "candidate-stories",
    when: ["missing", "empty"],
    reason: (s) => `Candidate stories are ${s.status}.`,
  },
  {
    id: "create-director-draft",
    priority: 80,
    label: "Create Director Draft",
    sectionId: "director-package",
    when: ["missing", "empty"],
    reason: (s) => `Director package is ${s.status}.`,
  },
  {
    id: "create-song-package",
    priority: 90,
    label: "Create Song Package",
    sectionId: "song-package",
    when: ["missing", "empty"],
    reason: (s) => `Song package is ${s.status}.`,
  },
  {
    id: "prepare-now-playing",
    priority: 100,
    label: "Prepare Now-Playing Package",
    sectionId: "now-playing-package",
    when: ["missing", "empty"],
    reason: (s) => `Now-playing package is ${s.status}.`,
  },
  {
    id: "complete-publisher-record",
    priority: 110,
    label: "Complete Publisher Record",
    sectionId: "publisher-record",
    when: ["missing", "empty"],
    reason: (s) => `Publisher record is ${s.status}.`,
  },
  {
    id: "fill-research-vault",
    priority: 120,
    label: "Fill Research Vault",
    sectionId: "research-vault",
    when: ["missing", "empty"],
    reason: (s) => `Research vault is ${s.status}.`,
  },
  {
    id: "attach-vdj-label",
    priority: 130,
    label: "Attach VirtualDJ Label RVTR",
    sectionId: "virtualdj-attached-rvtr",
    when: ["missing", "empty"],
    reason: (s) => `VirtualDJ Label RVTR is ${s.status}.`,
  },
];

const MAX_ACTIONS = 8;

/** Prioritized checklist from inventory statuses only. */
export function deriveRecommendedActions(
  sections: ExperienceInventorySection[],
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  // Errors first — fix before creating new assets.
  const errorSections = sections.filter((section) => section.status === "error");
  for (const section of errorSections) {
    actions.push({
      id: `fix-error-${section.id}`,
      priority: 1,
      label: `Fix Error: ${section.label}`,
      reason: section.error ?? "Inventory loader reported an error.",
      sectionId: section.id,
      sectionLabel: section.label,
      sectionStatus: "error",
    });
  }

  for (const rule of ACTION_RULES) {
    const section = byId(sections, rule.sectionId);
    if (!section) continue;
    if (!rule.when.includes(section.status)) continue;
    // Do not recommend creating an asset that already exists.
    if (
      (rule.label.startsWith("Create") ||
        rule.label.startsWith("Generate") ||
        rule.label.startsWith("Add") ||
        rule.label.startsWith("Collect") ||
        rule.label.startsWith("Prepare") ||
        rule.label.startsWith("Complete") ||
        rule.label.startsWith("Fill") ||
        rule.label.startsWith("Attach")) &&
      section.status === "available"
    ) {
      continue;
    }
    actions.push({
      id: rule.id,
      priority: rule.priority,
      label: rule.label,
      reason: rule.reason(section),
      sectionId: section.id,
      sectionLabel: section.label,
      sectionStatus: section.status,
    });
  }

  return actions
    .sort((a, b) => a.priority - b.priority || a.label.localeCompare(b.label))
    .slice(0, MAX_ACTIONS);
}

export function deriveSongWorkspaceBadges(
  sections: ExperienceInventorySection[],
): SongWorkspaceBadges {
  return {
    canonical: statusOf(sections, "canonical-song") === "available",
    virtualDj: statusOf(sections, "virtualdj-attached-rvtr") === "available",
    published:
      statusOf(sections, "public-exhibit") === "available" ||
      statusOf(sections, "public-experience") === "available",
    packageReady:
      statusOf(sections, "song-package") === "available" ||
      statusOf(sections, "universal-package") === "available",
  };
}

export type OperatorWorkspaceModel = {
  health: ExperienceHealthStatement[];
  actions: RecommendedAction[];
  badges: SongWorkspaceBadges;
};

export function buildOperatorWorkspace(
  inventory: ExperienceInventory,
): OperatorWorkspaceModel {
  return {
    health: deriveExperienceHealth(inventory.sections),
    actions: deriveRecommendedActions(inventory.sections),
    badges: deriveSongWorkspaceBadges(inventory.sections),
  };
}

export const FUTURE_TOOLS = [
  { id: "experience-enhancer", label: "Experience Enhancer" },
  { id: "collector", label: "Collector" },
  { id: "publisher", label: "Publisher" },
  { id: "studio-alpha", label: "Studio Alpha" },
  { id: "director", label: "Director" },
] as const;
