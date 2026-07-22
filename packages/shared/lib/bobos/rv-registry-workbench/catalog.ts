import "server-only";

import { existsSync, statSync } from "fs";

import {
  getPanelDocumentation,
  panelManualHref,
} from "@/lib/bobos/cockpit/panel-docs";
import type { PanelTypeId } from "@/lib/bobos/cockpit/types";
import { BOBOS_EVENT_HUB_ACTIONS, BOBOS_PRIMARY_NAV } from "@/lib/bobos/event-hub-nav";
import { formatRvId } from "@/lib/bobos/rv-ids";
import { RV_CATEGORIES, RV_CATEGORY_BY_ID, RV_REGISTRY } from "@/lib/bobos/rv-registry";

import { getCaptureSessionSnapshot } from "./capture-session";
import { isCapturable, resolveOpenHref } from "./routes";
import {
  loadWorkbenchReviews,
  screenshotPathFor,
  screenshotPublicApiPath,
} from "./store";
import type {
  WorkbenchCard,
  WorkbenchCatalogResponse,
  WorkbenchDecisionOrNone,
  WorkbenchRelatedPanel,
  WorkbenchReview,
} from "./types";

function emptyReview(): WorkbenchReview {
  return { decision: null, notes: "", viewedAt: null, updatedAt: null };
}

function collectRedirects(entryId: string, route: string | null, panelType?: PanelTypeId): string[] {
  const redirects = new Set<string>();
  if (panelType) {
    const docs = getPanelDocumentation(panelType);
    for (const item of docs?.publicRoutes ?? []) {
      if (/redirect/i.test(item.role) && item.path !== route) {
        redirects.add(`${item.path} — ${item.role}`);
      }
    }
  }
  // Known hard-coded retire/redirect relationships from registry descriptions.
  if (entryId === "RV02-04") {
    redirects.add("/bobos/pass-registration → /bobos/pass-management");
  }
  if (entryId === "RV02-02") {
    redirects.add("/ops/event-studio/producer → /bobos/producer");
  }
  return [...redirects];
}

function collectReplacements(entry: (typeof RV_REGISTRY)[number]): string[] {
  const out: string[] = [];
  const text = `${entry.description} ${entry.title}`.toLowerCase();
  if (entry.status === "Retired" || entry.status === "Deprecated") {
    for (const other of RV_REGISTRY) {
      if (other.id === entry.id) continue;
      if (
        text.includes(other.id.toLowerCase()) ||
        (other.route && text.includes(other.route.toLowerCase())) ||
        text.includes(other.title.toLowerCase())
      ) {
        out.push(`${other.id} · ${other.title}`);
      }
    }
  }
  if (entry.id === "RV02-04") out.push("RV02-05 · Pass Management", "RV05-05 · Pass Claim");
  if (entry.id === "RV02-06") out.push("RV02-02 · Event Producer", "RV02-03 · Design Builder");
  return [...new Set(out)];
}

function collectReferencedBy(entry: (typeof RV_REGISTRY)[number]): WorkbenchRelatedPanel[] {
  const needleId = entry.id.toLowerCase();
  const needleRoute = entry.route?.toLowerCase() ?? "";
  const needleTitle = entry.title.toLowerCase();
  const hits: WorkbenchRelatedPanel[] = [];
  for (const other of RV_REGISTRY) {
    if (other.id === entry.id) continue;
    const blob = `${other.description} ${other.title}`.toLowerCase();
    if (
      blob.includes(needleId) ||
      (needleRoute && blob.includes(needleRoute)) ||
      (needleTitle.length > 4 && blob.includes(needleTitle))
    ) {
      hits.push({ id: other.id, title: other.title });
    }
  }
  return hits;
}

function collectRelated(entry: (typeof RV_REGISTRY)[number]): WorkbenchRelatedPanel[] {
  return RV_REGISTRY.filter((other) => other.category === entry.category && other.id !== entry.id).map(
    (other) => ({ id: other.id, title: other.title }),
  );
}

/** Informational only — where retiring this app may leave dangling references. */
function collectRetirementImpact(
  entry: (typeof RV_REGISTRY)[number],
  panelDocsHref: string | null,
  referencedBy: WorkbenchRelatedPanel[],
): string[] {
  const tags: string[] = [];
  if (entry.cockpitEligible || entry.panelType) tags.push("Cockpit");
  const inPrimaryNav =
    Boolean(entry.navId) ||
    (entry.route != null && BOBOS_PRIMARY_NAV.some((item) => item.href === entry.route));
  if (inPrimaryNav) tags.push("Navigation");
  if (entry.route && BOBOS_EVENT_HUB_ACTIONS.some((item) => item.href === entry.route)) {
    tags.push("Event Hub");
  }
  if (panelDocsHref || entry.id === "RV00-00") tags.push("Documentation");
  if (referencedBy.length > 0) tags.push("Other applications");
  return tags;
}

function verificationFor(entry: (typeof RV_REGISTRY)[number]): {
  verification: WorkbenchCard["verification"];
  verificationLabel: string;
  purpose: string;
  lastModification: string | null;
  panelDocsHref: string | null;
} {
  if (!entry.panelType) {
    return {
      verification: "n/a",
      verificationLabel: "N/A",
      purpose: entry.description,
      lastModification: null,
      panelDocsHref: null,
    };
  }
  const docs = getPanelDocumentation(entry.panelType);
  if (!docs) {
    return {
      verification: "not-verified",
      verificationLabel: "Not Verified",
      purpose: entry.description,
      lastModification: null,
      panelDocsHref: null,
    };
  }
  const last = docs.changeHistory[0];
  return {
    verification: docs.verification.status,
    verificationLabel: docs.verification.status === "verified" ? "Verified" : "Not Verified",
    purpose: docs.purpose || entry.description,
    lastModification: last ? `${last.date} — ${last.summary}` : docs.verification.verifiedAt ?? null,
    panelDocsHref: panelManualHref(entry.id),
  };
}

export async function buildWorkbenchCatalog(): Promise<WorkbenchCatalogResponse> {
  const reviewsFile = await loadWorkbenchReviews();
  const cards: WorkbenchCard[] = RV_REGISTRY.map((entry) => {
    const openHref = resolveOpenHref(entry.route);
    const capture = isCapturable(entry.route, openHref);
    const shotPath = screenshotPathFor(entry.id);
    const screenshotExists = existsSync(shotPath);
    const screenshotMtime = screenshotExists ? String(statSync(shotPath).mtimeMs) : null;
    const meta = verificationFor(entry);
    const review = reviewsFile.reviews[entry.id] ?? emptyReview();
    const category = RV_CATEGORY_BY_ID[entry.category];
    const referencedBy = collectReferencedBy(entry);

    return {
      id: entry.id,
      displayId: formatRvId(entry.id),
      title: entry.title,
      category: entry.category,
      categoryTitle: category.title,
      categoryAccent: category.accent,
      route: entry.route,
      openHref,
      description: entry.description,
      purpose: meta.purpose,
      status: entry.status,
      verification: meta.verification,
      verificationLabel: meta.verificationLabel,
      panelType: entry.panelType ?? null,
      panelDocsHref: meta.panelDocsHref,
      referencedBy,
      relatedPanels: collectRelated(entry),
      knownRedirects: collectRedirects(entry.id, entry.route, entry.panelType),
      knownReplacements: collectReplacements(entry),
      retirementImpact: collectRetirementImpact(entry, meta.panelDocsHref, referencedBy),
      lastModification: meta.lastModification,
      screenshotExists,
      screenshotUrl: screenshotExists
        ? `${screenshotPublicApiPath(entry.id)}&t=${screenshotMtime}`
        : null,
      capturable: capture.capturable,
      captureBlockReason: capture.captureBlockReason,
      review,
    };
  });

  const byDecision: Record<WorkbenchDecisionOrNone, number> = {
    none: 0,
    keep: 0,
    rename: 0,
    move: 0,
    retire: 0,
    "review-later": 0,
  };
  for (const card of cards) {
    const key: WorkbenchDecisionOrNone = card.review.decision ?? "none";
    byDecision[key] += 1;
  }

  const captureSession = await getCaptureSessionSnapshot();

  return {
    cards,
    categories: RV_CATEGORIES.map((c) => ({
      id: c.id,
      title: c.title,
      accent: c.accent,
      description: c.description,
    })),
    counts: {
      total: cards.length,
      reviewed: cards.filter((c) => c.review.decision).length,
      viewed: cards.filter((c) => Boolean(c.review.viewedAt)).length,
      withScreenshot: cards.filter((c) => c.screenshotExists).length,
      byDecision,
    },
    captureSession,
  };
}
