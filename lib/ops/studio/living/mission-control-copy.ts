import type { LivingDepartmentId, LivingPipelineStage } from "./types";

export const DEPARTMENT_ROOM_COPY: Record<
  LivingDepartmentId,
  { purpose: string; openLabel: string; workingVerb: string; waitingLabel: string }
> = {
  collector: {
    purpose: "Research songs and gather every useful source — charts, artwork, credits, and media.",
    openLabel: "Open Collector",
    workingVerb: "researching",
    waitingLabel: "Waiting",
  },
  editor: {
    purpose: "Clean and normalize research — remove duplicates, merge facts, flag conflicts.",
    openLabel: "Open Editor",
    workingVerb: "cleaning data",
    waitingLabel: "Waiting",
  },
  director: {
    purpose: "Design the patron experience — Story, Timeline, DNA, and page flow.",
    openLabel: "Open Director",
    workingVerb: "designing the experience",
    waitingLabel: "Waiting",
  },
  publisher: {
    purpose: "Publish approved experiences — build pages, update search, mark packages live.",
    openLabel: "Open Publisher",
    workingVerb: "publishing",
    waitingLabel: "Waiting",
  },
};

export const PIPELINE_STAGE_COPY: Record<
  Exclude<LivingPipelineStage, "published">,
  { role: string; activeLabel: string; idleLabel: string }
> = {
  collector: {
    role: "Gather source material for each song",
    activeLabel: "Researching",
    idleLabel: "Waiting",
  },
  editor: {
    role: "Prepare a clean dataset for the Director",
    activeLabel: "Cleaning data",
    idleLabel: "Waiting",
  },
  director: {
    role: "Design Story, Timeline, DNA, and experiences",
    activeLabel: "Designing",
    idleLabel: "Waiting",
  },
  publisher: {
    role: "Publish finished experiences for patrons",
    activeLabel: "Publishing",
    idleLabel: "Waiting",
  },
};

export type MissionControlAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  primary?: boolean;
};

export const MISSION_CONTROL_ACTIONS: MissionControlAction[] = [
  {
    id: "batch",
    title: "Start Batch Processing",
    description: "Queue songs from your library and run them through the pipeline overnight.",
    href: "/ops/browser-plus-2",
    primary: true,
  },
  {
    id: "packages",
    title: "Review Packages",
    description: "See what is ready to publish and approve finished experiences.",
    href: "/ops/studio/publisher",
    primary: true,
  },
  {
    id: "library",
    title: "Open Library & Queue",
    description: "Browse your video library, check readiness, and manage the production queue.",
    href: "/ops/browser-plus-2",
  },
  {
    id: "director",
    title: "Open Director Studio",
    description: "Design experiences — Story pages, timelines, and patron flow.",
    href: "/ops/studio/director",
  },
  {
    id: "publisher-queue",
    title: "Review Publisher Queue",
    description: "Packages waiting for editorial review and publish approval.",
    href: "/ops/studio/publisher",
  },
  {
    id: "latest",
    title: "Browse Published Packages",
    description: "See recently published experiences with full artwork.",
    href: "/ops/studio/publisher/museum",
  },
];
