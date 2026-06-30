import { listGenerations } from "@/lib/ops/content-creator/library";
import type { ContentCreatorGenerationIndexEntry } from "@/lib/ops/content-creator/library/types";
import { loadEventControlConfig } from "@/lib/ops/event-control/store";

import { loadGiveawayStudio } from "../giveaway/load-giveaway-studio";
import { loadProductionBinder } from "../production-binder";
import type { EventStudioSection } from "../types";
import { plannedGeneratorHref } from "../planned-generators";

import type { ProductionModuleCard, ProductionModuleId, ProductionModuleStatus } from "./module-status";
import { maxProductionStatus, productionModuleStatusLabel } from "./module-status";
import { getActiveProducerDraft, getStoredModuleStatuses, loadProducerState } from "./producer-state";
import type { EventProducerParsedPlan } from "./types";

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

function derivePassesStatus(
  passes: ContentCreatorGenerationIndexEntry[],
  stored: ProductionModuleStatus | undefined,
): ProductionModuleStatus {
  const latest = passes[0];
  let derived: ProductionModuleStatus = "NOT_STARTED";
  if (latest) {
    derived =
      latest.status === "production_ready" || latest.status === "approved"
        ? "APPROVED"
        : latest.hasExport || latest.thumbnailPath
          ? "GENERATED"
          : "IN_PROGRESS";
  }
  return stored ? maxProductionStatus(stored, derived) : derived;
}

function deriveHomepageStatus(
  config: Awaited<ReturnType<typeof loadEventControlConfig>>,
  stored: ProductionModuleStatus | undefined,
): ProductionModuleStatus {
  let derived: ProductionModuleStatus = "NOT_STARTED";
  if (config.event.active) derived = "PUBLISHED";
  else if (config.homepage.headline?.trim() || config.homepage.featureImageUrl?.trim()) {
    derived = "GENERATED";
  }
  return stored ? maxProductionStatus(stored, derived) : derived;
}

function deriveGiveawayStatus(
  giveaway: Awaited<ReturnType<typeof loadGiveawayStudio>>,
  stored: ProductionModuleStatus | undefined,
): ProductionModuleStatus {
  const active = giveaway.activeGiveaway;
  let derived: ProductionModuleStatus = "NOT_STARTED";
  if (active) {
    if (active.status === "completed" || active.status === "archived") derived = "PUBLISHED";
    else if (active.status === "live" || active.status === "drawing") derived = "IN_PROGRESS";
    else if (active.prize.title.trim() || active.scheduledDrawAt) derived = "GENERATED";
  }
  return stored ? maxProductionStatus(stored, derived) : derived;
}

function deriveIdentityStatus(
  hasActivePlan: boolean,
  syncedAt: string | null,
  stored: ProductionModuleStatus | undefined,
): ProductionModuleStatus {
  let derived: ProductionModuleStatus = hasActivePlan && syncedAt ? "APPROVED" : "NOT_STARTED";
  return stored ? maxProductionStatus(stored, derived) : derived;
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
      actionLabel: statuses.passes === "APPROVED" || statuses.passes === "PUBLISHED" ? "Open Pass Generator" : "Generate Passes",
      href: "/ops/event-studio/create/pass-generator",
      ready: Boolean(plan?.passes.enabled || plan?.recommendedModules.passes),
    },
    {
      id: "poster",
      title: "Poster",
      status: statuses.poster,
      description: "Venue poster artwork inherits identity from the producer plan.",
      uses: plan?.theme ? [`Theme: ${plan.theme}`] : ["Venue, dates, theme from producer plan"],
      actionLabel: "Generate Poster",
      href: plannedGeneratorHref("poster"),
      ready: Boolean(plan?.recommendedModules.poster),
    },
    {
      id: "facebook",
      title: "Facebook",
      status: statuses.facebook,
      description: "Facebook event cover and share graphics from approved identity.",
      uses: ["Event title", "Venue", "Dates", "Theme"],
      actionLabel: "Generate Facebook Graphic",
      href: plannedGeneratorHref("facebook"),
      ready: Boolean(plan?.recommendedModules.facebookPost),
    },
    {
      id: "homepage",
      title: "Homepage",
      status: statuses.homepage,
      description: "Public homepage hero and programming blocks from the producer plan.",
      uses: ["Headline", "Theme", "Registration CTA"],
      actionLabel: "Generate Homepage",
      href: plannedGeneratorHref("landing-page"),
      ready: Boolean(plan?.recommendedModules.landingPage || plan?.registration.enabled),
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
      ready: Boolean(plan?.giveaway.enabled || plan?.recommendedModules.giveaway),
    },
    {
      id: "registration",
      title: "Registration",
      status: statuses.registration,
      description: "Pass registration flow connected to giveaway audience.",
      uses: plan?.registration.rules
        ? [plan.registration.rules]
        : ["QR signup", "Pass holder verification"],
      actionLabel: "Generate Registration",
      href: plannedGeneratorHref("registration"),
      ready: Boolean(plan?.registration.enabled),
    },
  ];

  return cards;
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

const DEFAULT_MODULE_STATUSES = (): Record<ProductionModuleId, ProductionModuleStatus> => ({
  identity: "NOT_STARTED",
  passes: "NOT_STARTED",
  poster: "NOT_STARTED",
  facebook: "NOT_STARTED",
  homepage: "NOT_STARTED",
  giveaway: "NOT_STARTED",
  registration: "NOT_STARTED",
});

export async function loadProducerWorkflow(): Promise<ProducerWorkflow> {
  const [activeDraft, storedStatuses, producerState, config, giveaway, binder] = await Promise.all([
    getActiveProducerDraft(),
    getStoredModuleStatuses(),
    loadProducerState(),
    loadEventControlConfig(),
    loadGiveawayStudio().catch(() => null),
    loadProductionBinder().catch(() => null),
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

  const statuses = DEFAULT_MODULE_STATUSES();
  statuses.identity = deriveIdentityStatus(
    hasActivePlan,
    producerState.syncedAt,
    storedStatuses.identity,
  );
  statuses.passes = derivePassesStatus(passes, storedStatuses.passes);
  statuses.homepage = deriveHomepageStatus(config, storedStatuses.homepage);
  statuses.giveaway = giveaway
    ? deriveGiveawayStatus(giveaway, storedStatuses.giveaway)
    : storedStatuses.giveaway ?? "NOT_STARTED";
  statuses.poster = storedStatuses.poster ?? "NOT_STARTED";
  statuses.facebook = storedStatuses.facebook ?? "NOT_STARTED";
  statuses.registration =
    storedStatuses.registration ??
    (parsedPlan?.registration.enabled ? "IN_PROGRESS" : "NOT_STARTED");

  if (hasActivePlan && statuses.identity === "NOT_STARTED") {
    statuses.identity = "APPROVED";
  }

  const cards = buildCards(parsedPlan, statuses);

  const navStatuses: Partial<Record<EventStudioSection, ProductionModuleStatus>> = {
    producer: hasActivePlan ? "IN_PROGRESS" : "NOT_STARTED",
    identity: statuses.identity,
    assets: binder?.assets.some((asset) => asset.status !== "missing") ? "GENERATED" : "NOT_STARTED",
    create: statuses.passes,
    publish: maxProductionStatus(statuses.homepage, statuses.facebook),
    giveaway: statuses.giveaway,
    archive: "NOT_STARTED",
  };

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
