/** Review decisions for the temporary RV Registry Workbench. Does not mutate the RV registry. */

export type WorkbenchDecision = "keep" | "rename" | "move" | "retire" | "review-later";

export type WorkbenchDecisionOrNone = WorkbenchDecision | "none";

export type WorkbenchReview = {
  decision: WorkbenchDecision | null;
  notes: string;
  /** ISO timestamp when Bob marked this app as viewed in the workbench. */
  viewedAt: string | null;
  updatedAt: string | null;
};

export type WorkbenchReviewsFile = {
  version: 1;
  reviews: Record<string, WorkbenchReview>;
};

export type WorkbenchRelatedPanel = {
  id: string;
  title: string;
};

export type ScreenshotCaptureResult = {
  ok: boolean;
  rvId: string;
  path: string | null;
  /** Public API URL for the saved thumbnail (success only). */
  url: string | null;
  /** Absolute Playwright navigation URL attempted. */
  attemptedUrl: string | null;
  /** Final page URL after redirects, when available. */
  finalUrl: string | null;
  /** Short reason for card UI. */
  error?: string;
  /** Full Playwright / system message for detail dialog. */
  detail?: string;
  consoleErrors?: string[];
  /** True when PIN gate / access denied blocked saving a thumbnail. */
  sessionLocked?: boolean;
  pageKind?: string;
};

export type CaptureSessionStatus = "locked" | "ready" | "expired" | "unknown";

export type CaptureSessionSnapshot = {
  version: 1;
  status: CaptureSessionStatus;
  headedOpen: boolean;
  lastCheckedAt: string | null;
  lastReadyAt: string | null;
  lastMessage: string | null;
  testRoute: string | null;
  profileDir: string;
};

export type WorkbenchCard = {
  id: string;
  displayId: string;
  title: string;
  category: string;
  categoryTitle: string;
  categoryAccent: string;
  route: string | null;
  /** Concrete href for Open Panel (placeholders substituted when possible). */
  openHref: string | null;
  description: string;
  purpose: string;
  status: string;
  verification: "verified" | "not-verified" | "n/a";
  verificationLabel: string;
  panelType: string | null;
  panelDocsHref: string | null;
  referencedBy: WorkbenchRelatedPanel[];
  relatedPanels: WorkbenchRelatedPanel[];
  knownRedirects: string[];
  knownReplacements: string[];
  /**
   * Informational only — structural places this app appears.
   * Shown when Retire is selected; never mutates the registry.
   */
  retirementImpact: string[];
  lastModification: string | null;
  screenshotExists: boolean;
  screenshotUrl: string | null;
  capturable: boolean;
  captureBlockReason: string | null;
  review: WorkbenchReview;
};

export type WorkbenchCatalogResponse = {
  cards: WorkbenchCard[];
  categories: Array<{ id: string; title: string; accent: string; description: string }>;
  counts: {
    total: number;
    reviewed: number;
    viewed: number;
    withScreenshot: number;
    byDecision: Record<WorkbenchDecisionOrNone, number>;
  };
  captureSession: CaptureSessionSnapshot;
};
