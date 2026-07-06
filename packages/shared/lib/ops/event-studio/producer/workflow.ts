import { listGenerations } from "@/lib/ops/content-creator/library";
import type { ContentCreatorGenerationIndexEntry } from "@/lib/ops/content-creator/library/types";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";

import { loadGiveawayStudio } from "../giveaway/load-giveaway-studio";
import type { EventStudioSection } from "../types";

import type { ProductionModuleCard, ProductionModuleId, ProductionModuleStatus } from "./module-status";
import { productionModuleStatusLabel } from "./module-status";
import { getActiveProducerDraft, loadProducerState } from "./producer-state";
import type { EventProducerParsedPlan } from "./types";

const SUNDAY_PIPELINE: ProductionModuleId[] = ["passes", "giveaway", "homepage"];

const SUNDAY_NAV_SECTIONS = new Set<EventStudioSection>([
  "producer",
  "passes",
  "giveaway",
  "homepage",
  "settings",
]);

function passGenerationsForEvent(
  generations: ContentCreatorGenerationIndexEntry[],
  eventName: string,
): ContentCreatorGenerationIndexEntry[] {
  const needle = eventName.trim().toLowerCase();
  return generations
    .filter((entry) => entry.artifact === "pass")
    .filter((entry) => {
      const event = entry.event.trim().toLowerCase();
      return !needle || event.includes(needle) || needle.includes(event);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function derivePassesStatus(passes: ContentCreatorGenerationIndexEntry[]): ProductionModuleStatus {
  const latest = passes[0];
  if (!latest) return "NOT_STARTED";
  if (latest.status === "production_ready" || latest.status === "approved") return "GENERATED";
  if (latest.hasExport || latest.thumbnailPath) return "GENERATED";
  return "NOT_STARTED";
}

function deriveHomepageStatus(
  hasActivePlan: boolean,
  syncedAt: string | null,
  eventActive: boolean,
): ProductionModuleStatus {
  if (eventActive) return "PUBLISHED";
  if (hasActivePlan && syncedAt) return "READY";
  return "NOT_STARTED";
}

function deriveGiveawayStatus(
  giveaway: Awaited<ReturnType<typeof loadGiveawayStudio>> | null,
  plan: EventProducerParsedPlan | null,
): ProductionModuleStatus {
  const active = giveaway?.activeGiveaway;
  const prizeTitle = active?.prize.title.trim() || plan?.giveaway.prize.trim() || "";
  const drawDate = active?.scheduledDrawAt || plan?.giveaway.drawDate.trim() || "";
  const registrationUrl = giveaway?.registrationUrl?.trim() || "";

  if (active?.status === "completed" && registrationUrl) return "PUBLISHED";
  if ((giveaway?.entryCount ?? 0) > 0) return "GENERATED";
  if (prizeTitle && drawDate && registrationUrl) return "READY";
  if (prizeTitle || plan?.giveaway.enabled) return "READY";
  return "NOT_STARTED";
}

function passUses(plan: EventProducerParsedPlan | null): string[] {
  if (!plan) return ["Standard passes", "Print-ready export"];
  const uses: string[] = [];
  if (plan.passes.standardPasses) uses.push("Standard passes");
  if (plan.passes.premiumPasses) {
    uses.push("Premium backstage passes");
    if (plan.passes.premiumPerSheet > 0) {
      uses.push(`${plan.passes.premiumPerSheet} premium per sheet`);
    }
  }
  if (plan.registration.enabled) uses.push("Auto-registration QR");
  if (plan.passes.paperSize.trim()) uses.push(`${plan.passes.paperSize} layout`);
  if (uses.length === 0) uses.push("Collector passes from analyzed plan");
  return uses;
}

function buildCards(
  plan: EventProducerParsedPlan | null,
  statuses: Record<ProductionModuleId, ProductionModuleStatus>,
): ProductionModuleCard[] {
  const cards: ProductionModuleCard[] = [
    {
      id: "passes",
      title: "Passes",
      status: statuses.passes,
      description: "Generate collectible passes and print sheets from the analyzed plan.",
      uses: passUses(plan),
      actionLabel: statuses.passes === "GENERATED" ? "Open Design Builder" : "Build Passes",
      href: "/bobos/passes",
      ready: true,
    },
    {
      id: "giveaway",
      title: "Giveaway",
      status: statuses.giveaway,
      description: "Prize drawing workspace seeded from the analyzed giveaway rules.",
      uses: plan?.giveaway.prize
        ? [plan.giveaway.prize, plan.giveaway.drawDate ? `Draw: ${plan.giveaway.drawDate}` : ""].filter(Boolean)
        : ["Prize", "Draw schedule", "Registration entries"],
      actionLabel: "Open Giveaway Studio",
      href: "/ops/event-studio/giveaway",
      ready: true,
    },
    {
      id: "homepage",
      title: "Homepage",
      status: statuses.homepage,
      description: "Sunday public homepage preview built from the producer plan.",
      uses: [
        plan?.eventTitle.trim() || "Event title",
        plan?.venue.trim() || "Venue",
        plan?.dateSummary.trim() || plan?.dates.join(", ") || "Dates",
        plan?.giveaway.prize.trim() ? `Giveaway: ${plan.giveaway.prize}` : "Giveaway CTA",
      ].filter(Boolean),
      actionLabel: "Open Homepage Preview",
      href: "/ops/event-studio/homepage",
      ready: true,
    },
  ];

  return cards.filter((card) => SUNDAY_PIPELINE.includes(card.id));
}

export type ProducerWorkflow = {
  hasActivePlan: boolean;
  activeDraftId: string | null;
  parsedPlan: EventProducerParsedPlan | null;
  sourceText: string | null;
  cards: ProductionModuleCard[];
  navStatuses: Partial<Record<EventStudioSection, ProductionModuleStatus>>;
  moduleStatuses: Record<ProductionModuleId, ProductionModuleStatus>;
};

export async function loadProducerWorkflow(): Promise<ProducerWorkflow> {
  const [activeDraft, producerState, config, giveaway] = await Promise.all([
    getActiveProducerDraft(),
    loadProducerState(),
    loadEventControlConfig(),
    loadGiveawayStudio().catch(() => null),
  ]);

  let passes: ContentCreatorGenerationIndexEntry[] = [];
  try {
    passes = passGenerationsForEvent(
      await listGenerations({ limit: 200, sort: "updated" }),
      config.event.title,
    );
  } catch {
    passes = [];
  }

  const hasActivePlan = Boolean(activeDraft);
  const parsedPlan = activeDraft?.parsedPlan ?? null;
  const syncedAt = producerState.syncedAt;

  const statuses: Record<ProductionModuleId, ProductionModuleStatus> = {
    identity: "NOT_STARTED",
    passes: derivePassesStatus(passes),
    poster: "NOT_STARTED",
    facebook: "NOT_STARTED",
    homepage: deriveHomepageStatus(hasActivePlan, syncedAt, config.event.active === true),
    giveaway: deriveGiveawayStatus(giveaway, parsedPlan),
    registration: "NOT_STARTED",
  };

  const cards = buildCards(parsedPlan, statuses);

  const navStatuses: Partial<Record<EventStudioSection, ProductionModuleStatus>> = {
    producer: hasActivePlan ? "READY" : "NOT_STARTED",
    passes: statuses.passes,
    giveaway: statuses.giveaway,
    homepage: statuses.homepage,
  };

  for (const key of Object.keys(navStatuses) as EventStudioSection[]) {
    if (!SUNDAY_NAV_SECTIONS.has(key)) {
      delete navStatuses[key];
    }
    if (navStatuses[key] === "PUBLISHED" && key === "homepage" && !config.event.active) {
      delete navStatuses[key];
    }
  }

  return {
    hasActivePlan,
    activeDraftId: activeDraft?.id ?? null,
    parsedPlan,
    sourceText: activeDraft?.sourceText ?? null,
    cards,
    navStatuses,
    moduleStatuses: statuses,
  };
}

export { productionModuleStatusLabel };
