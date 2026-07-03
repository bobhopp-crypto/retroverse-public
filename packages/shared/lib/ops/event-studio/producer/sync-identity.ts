import { loadEventControlConfig, saveEventControlConfig } from "@/lib/ops/event-control/store";
import type { EventControlConfig, EventControlSavePayload } from "@/lib/ops/event-control/types";
import { slugifyEventKey } from "@/lib/ops/event-studio/giveaway/event-key";
import {
  getActiveGiveaway,
  loadGiveawayStudioState,
  saveGiveawayStudioState,
  updateGiveawayInState,
} from "@/lib/ops/event-studio/giveaway/store";

import { markSynced } from "./producer-state";
import type { EventProducerParsedPlan } from "./types";

function parseYearFromEraToken(token: string): number | null {
  const trimmed = token.trim();
  const four = trimmed.match(/\b(19|20)\d{2}\b/);
  if (four) {
    const year = Number(four[0]);
    return year >= 1950 && year <= 2100 ? year : null;
  }
  const two = trimmed.match(/\b(\d{2})s\b/i);
  if (two) {
    const decade = Number(two[1]!);
    const year = decade >= 30 ? 1900 + decade : 2000 + decade;
    return year >= 1950 && year <= 2100 ? year : null;
  }
  return null;
}

function featuredYearsFromPlan(
  plan: EventProducerParsedPlan,
  existing: EventControlConfig,
): number[] {
  const parsed = plan.musicEra
    .map(parseYearFromEraToken)
    .filter((year): year is number => year != null);
  const unique = [...new Set(parsed)];
  if (unique.length >= 3) return unique.slice(0, 4);
  return existing.featuredYears;
}

function eventDateFromPlan(plan: EventProducerParsedPlan, existing: EventControlConfig): string {
  if (plan.dateSummary.trim()) return plan.dateSummary.trim();
  if (plan.dates.length > 0) return plan.dates.join(", ");
  return existing.event.date;
}

export function planToEventControlPayload(
  plan: EventProducerParsedPlan,
  existing: EventControlConfig,
): EventControlSavePayload {
  const wantsEventHomepage =
    plan.registration.enabled ||
    plan.recommendedModules.landingPage ||
    plan.giveaway.enabled;

  return {
    event: {
      title: plan.eventTitle.trim() || existing.event.title,
      venue: plan.venue.trim() || existing.event.venue,
      date: eventDateFromPlan(plan, existing),
      active: existing.event.active,
    },
    featuredYears: featuredYearsFromPlan(plan, existing),
    homepage: {
      ...existing.homepage,
      headline: plan.eventTitle.trim() || existing.homepage.headline,
      subheadline: plan.theme.trim() || existing.homepage.subheadline,
      mode: wantsEventHomepage ? "EVENT" : existing.homepage.mode,
    },
    rvbr: {
      ...existing.rvbr,
      issueTheme: plan.theme.trim() || existing.rvbr.issueTheme,
      tagline: plan.seriesName.trim() || existing.rvbr.tagline,
    },
  };
}

async function syncGiveawayFromPlan(plan: EventProducerParsedPlan, eventTitle: string): Promise<void> {
  if (!plan.giveaway.enabled && !plan.registration.enabled) return;

  const eventKey = slugifyEventKey(eventTitle);
  let state = await loadGiveawayStudioState(eventKey);
  const active = getActiveGiveaway(state);
  if (!active) return;

  const patch: Parameters<typeof updateGiveawayInState>[2] = {};

  if (plan.giveaway.prize.trim()) {
    patch.prize = {
      ...active.prize,
      title: plan.giveaway.prize.trim(),
      description: plan.giveaway.rules.trim() || active.prize.description,
    };
  }

  if (plan.giveaway.drawDate.trim()) {
    patch.scheduledDrawAt = plan.giveaway.drawDate.trim();
  }

  if (plan.giveaway.rules.trim()) {
    patch.rules = plan.giveaway.rules.trim();
  }

  if (plan.registration.rules.trim()) {
    patch.registration = {
      ...active.registration,
      headline: plan.registration.rules.trim(),
    };
  }

  if (Object.keys(patch).length === 0) return;

  state = updateGiveawayInState(state, active.id, patch);
  await saveGiveawayStudioState(state);
}

export async function syncProducerPlanToStudio(plan: EventProducerParsedPlan): Promise<EventControlConfig> {
  const existing = await loadEventControlConfig();
  const payload = planToEventControlPayload(plan, existing);
  const config = await saveEventControlConfig(payload);
  await syncGiveawayFromPlan(plan, config.event.title);
  await markSynced();
  return config;
}
