import { identifyStrings } from "@/lib/ops/studio/model-identity";

import type {
  AnnotatedCardGuide,
  DepartmentContext,
  DepartmentContextDefinition,
  PageGuide,
  PageGuideDefinition,
  TourStep,
} from "./types";

export const PAGE_GUIDES: Record<string, PageGuideDefinition> = {
  dashboard: {
    id: "dashboard",
    title: "Mission Control",
    purpose: "Studio operational home — live department status and pipeline overview.",
    primaryWorkflow: "Review department status → open a department → use Library & Queue for batches.",
    typicalActions: [
      "Check live department status",
      "Open Mission Control departments",
      "Switch to Library & Queue for batch production",
    ],
    relatedDepartments: ["Collector", "Editor", "Director", "Publisher"],
    expectedOutputs: ["Awareness of queue depth", "Department entry points"],
    commonProblems: [
      "Department shows idle but backlog exists — open Library & Queue",
      "Need batch run — use Library & Queue, monitor here",
    ],
    checkFrequency: "Start of each session",
    actionRequiredWhen: "Any department error or queue backlog before live testing",
  },
  "mission-control": {
    id: "mission-control",
    title: "Mission Control",
    purpose: "Studio operational home — live department status, pipeline, and activity.",
    primaryWorkflow: "Check department status → open a department → use Library & Queue for batch runs.",
    typicalActions: [
      "Review live department cards and pipeline counts",
      "Open Collector, Editor, Director, or Publisher",
      "Switch to Library & Queue for overnight batches",
    ],
    relatedDepartments: ["Collector", "Editor", "Director", "Publisher", "Library & Queue"],
    expectedOutputs: ["Awareness of queue depth", "Department entry", "Batch runs via Library & Queue"],
    commonProblems: [
      "Department shows idle but queue has jobs — open Library & Queue",
      "Counts stale — refresh Mission Control (auto-polls every 2.5s)",
    ],
    checkFrequency: "Start of each session; during batch runs",
    actionRequiredWhen: "Any department error state or large queue backlog before live testing",
  },
  collector: {
    id: "collector",
    title: "Collector",
    purpose: "Collect every piece of information that may be useful for a song package.",
    primaryWorkflow: "Select RVTR → run Collector → verify collector.json on disk.",
    typicalActions: [
      "Browse Research Library",
      "Open a song workspace",
      "Queue Collector batch from Mission Control",
    ],
    relatedDepartments: ["Browser+", "Research Center", "Editor"],
    expectedOutputs: ["collector.json — complete research package", "Chart history, artwork, credits, media"],
    commonProblems: [
      "No package yet — run Collector from Browser+ batch bar",
      "Missing chart or cover data — check source logs",
    ],
    checkFrequency: "When onboarding new songs or after identity assignment",
    actionRequiredWhen: "Needs Collector count rising in Mission Control health",
  },
  editor: {
    id: "editor",
    title: "Editor",
    purpose: "Prepare Collector research for the Director — dedupe, normalize, merge facts, flag conflicts.",
    primaryWorkflow: "Open RVTR with Collector complete → clean dataset → hand off to Director.",
    typicalActions: [
      "Review normalized facts",
      "Resolve duplicate entries",
      "Flag unresolved conflicts",
    ],
    relatedDepartments: ["Collector", "Director"],
    expectedOutputs: ["editor.json — clean canonical dataset", "Director handoff"],
    commonProblems: [
      "Missing Collector package — run Collector first",
      "Duplicate facts — merge before Director handoff",
    ],
    checkFrequency: "After Collector completes for priority songs",
    actionRequiredWhen: "Editor coverage lagging Collector coverage",
  },
  director: {
    id: "director",
    title: "Director",
    purpose: "Design the Retroverse experience — Story, Timeline, DNA, Artist, Label, and Chart pages.",
    primaryWorkflow: "Open RVTR with Editor handoff → plan experiences → produce render spec.",
    typicalActions: [
      "Decide which experiences exist",
      "Set page ordering and presentation",
      "Build complete experience blueprint",
    ],
    relatedDepartments: ["Editor", "Publisher"],
    expectedOutputs: ["director.json", "director-render-spec.json", "Experience blueprint"],
    commonProblems: [
      "Missing render spec — run Director department job",
      "Incomplete handoff — send back to Editor",
    ],
    checkFrequency: "Before publishing cohorts",
    actionRequiredWhen: "Render Ready count below publish targets",
  },
  publisher: {
    id: "publisher",
    title: "Publisher",
    purpose: "Publish what the Director approved — build assets, pages, indexes, and mark packages live.",
    primaryWorkflow: "Review Director-approved packages → publish → verify patron surfaces.",
    typicalActions: [
      "Approve or publish ready packages",
      "Review evaluation scorecard",
      "Export to live experience",
    ],
    relatedDepartments: ["Director"],
    expectedOutputs: ["Published Retroverse package", "Search indexes updated"],
    commonProblems: [
      "Missing render spec — Director must complete first",
      "Evaluation blocked — review coaching issues",
    ],
    checkFrequency: "After Director approves priority cohorts",
    actionRequiredWhen: "Packages ready but not published for live testing",
  },
};

export const DEPARTMENT_CONTEXT: Record<string, DepartmentContextDefinition> = {
  collector: {
    department: "collector",
    inputs: ["VirtualDJ library row (RVTR assigned)", "Charts, artwork, credits, external references"],
    outputs: ["collector.json — complete research package"],
    nextDepartment: "Editor",
  },
  editor: {
    department: "editor",
    inputs: ["collector.json", "Raw research facts and media"],
    outputs: ["editor.json — clean canonical dataset", "Director handoff"],
    nextDepartment: "Director",
  },
  director: {
    department: "director",
    inputs: ["editor.json", "Director handoff", "Clean canonical dataset"],
    outputs: ["director.json", "director-render-spec.json", "Experience blueprint"],
    nextDepartment: "Publisher",
  },
  publisher: {
    department: "publisher",
    inputs: ["Director-approved experience blueprint", "Render spec"],
    outputs: ["Published Retroverse package", "Live pages and search indexes"],
    nextDepartment: "Patron surfaces",
  },
  "mission-control": {
    department: "mission-control",
    inputs: ["Live department status", "Pipeline activity stream"],
    outputs: ["Operator routing to departments", "Batch handoff to Library & Queue"],
    nextDepartment: "Collector, Editor, Director, or Publisher",
  },
  dashboard: {
    department: "dashboard",
    inputs: ["Live department status", "Pipeline counts"],
    outputs: ["Department entry decisions"],
    nextDepartment: "Any active department",
  },
};

export const ANNOTATED_CARDS: Record<string, AnnotatedCardGuide> = {
  missionControl: {
    title: "Mission Control",
    purpose: "Live production status for the entire Studio.",
    monitors: "Queue depth, worker activity, failures, and time remaining.",
    checkFrequency: "Every session; immediately after overnight runs.",
    actionRequired: "Lamp yellow/red, blocked jobs, or failed count > 0.",
  },
  productionQueue: {
    title: "Production Queue",
    purpose: "Ordered list of batch jobs processing RVTRs through departments.",
    monitors: "Active, paused, and recent completed/failed jobs.",
    checkFrequency: "During batch runs and each morning.",
    actionRequired: "Paused queue with backlog; failed jobs needing retry.",
  },
  productionHealth: {
    title: "Production Health",
    purpose: "Catalog-wide coverage and quality metrics.",
    monitors: "Collector/Editor/Director coverage, render ready, patron value.",
    checkFrequency: "Daily; before scheduling overnight batches.",
    actionRequired: "Coverage drops or Needs Attention count spikes.",
  },
  dailyReport: {
    title: "Daily Production Report",
    purpose: "Summary of last 24 hours — what ran, what failed, what needs review.",
    monitors: "Overnight batches, failures, throughput, package integrity.",
    checkFrequency: "First check each morning.",
    actionRequired: "Any failure row or integrity gaps on priority RVTRs.",
  },
};

export const GUIDED_TOURS: Record<string, TourStep[]> = {
  "mission-control": [
    {
      target: '[data-guide="mission-hero"]',
      title: "Status lamp",
      body: "Green = all clear. Gold = work running. Yellow = needs your attention before production continues.",
    },
    {
      target: '[data-guide="mission-stats"]',
      title: "Work counts",
      body: "Waiting, Running, Completed, Blocked, and Failed — your operational pulse at a glance.",
    },
    {
      target: '[data-guide="production-queue"]',
      title: "Production Queue",
      body: "Pause, resume, or cancel batch jobs here. Failed jobs offer Try Again for failed songs only.",
    },
    {
      target: '[data-guide="production-health"]',
      title: "Production Health",
      body: "Coverage percentages show how far your library has moved through Collector → Editor → Director.",
    },
    {
      target: '[data-guide="daily-report"]',
      title: "Daily Report",
      body: "Start here each morning: overnight runs, failures, and package integrity.",
    },
    {
      target: '[data-guide="batch-bar"]',
      title: "Batch actions",
      body: "Queue Top 100 or entire library for overnight Collector/Editor/Director runs.",
    },
  ],
  collector: [
    {
      target: '[data-guide="studio-pipeline"]',
      title: "Production pipeline",
      body: "You are in Collector — gather every useful fact, source, and asset. Output feeds Editor.",
    },
    {
      target: '[data-guide="about-page"]',
      title: "About this page",
      body: "Expand anytime for purpose, workflow, and common problems — no external docs needed.",
    },
  ],
  editor: [
    {
      target: '[data-guide="studio-pipeline"]',
      title: "Production pipeline",
      body: "Editor cleans Collector output into one normalized dataset for the Director.",
    },
    {
      target: '[data-guide="about-page"]',
      title: "About this page",
      body: "Editor requires collector.json — check department context when guide mode is on.",
    },
  ],
  director: [
    {
      target: '[data-guide="studio-pipeline"]',
      title: "Production pipeline",
      body: "Director designs the experience — Story, Timeline, DNA, and related pages.",
    },
    {
      target: '[data-guide="about-page"]',
      title: "About this page",
      body: "Review patron value and confidence before approving render-ready packages.",
    },
  ],
  dashboard: [
    {
      target: '[data-guide="studio-pipeline"]',
      title: "Studio overview",
      body: "Mission Control is the Studio home. Library & Queue handles batch production.",
    },
    {
      target: '[data-guide="about-page"]',
      title: "About this page",
      body: "Each department card opens that office — Collector is live today.",
    },
  ],
};

export function getPageGuide(id: string): PageGuide | undefined {
  const raw = PAGE_GUIDES[id];
  if (!raw) return undefined;
  return {
    ...raw,
    typicalActions: identifyStrings(`${raw.id}-action`, raw.typicalActions),
    expectedOutputs: identifyStrings(`${raw.id}-output`, raw.expectedOutputs),
    commonProblems: identifyStrings(`${raw.id}-problem`, raw.commonProblems),
  };
}

export function getDepartmentContext(id: string): DepartmentContext | undefined {
  const raw = DEPARTMENT_CONTEXT[id];
  if (!raw) return undefined;
  return {
    ...raw,
    inputs: identifyStrings(`${raw.department}-input`, raw.inputs),
    outputs: identifyStrings(`${raw.department}-output`, raw.outputs),
  };
}

export function getTourSteps(id: string): TourStep[] {
  return GUIDED_TOURS[id] ?? [];
}

export function getAnnotatedCard(id: string): AnnotatedCardGuide | undefined {
  return ANNOTATED_CARDS[id];
}
