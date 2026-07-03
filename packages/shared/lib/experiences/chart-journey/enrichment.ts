import type { CollectorPackage } from "@/lib/ops/studio/collector/types";

import type {
  ChartJourneyAwardsPayload,
  ChartJourneyInternationalPayload,
  ChartJourneyLegacyPayload,
} from "./types";

const INTL_REGIONS: Array<{ pattern: RegExp; code: string; label: string }> = [
  { pattern: /\bUK\b|United Kingdom|Britain/i, code: "UK", label: "United Kingdom" },
  { pattern: /\bCanada\b/i, code: "CA", label: "Canada" },
  { pattern: /\bAustralia\b/i, code: "AU", label: "Australia" },
  { pattern: /\bGermany\b/i, code: "DE", label: "Germany" },
  { pattern: /\bJapan\b/i, code: "JP", label: "Japan" },
  { pattern: /\bUSA\b|United States|Billboard Hot 100/i, code: "US", label: "United States" },
];

function factTexts(collector: CollectorPackage | null): string[] {
  if (!collector) return [];
  return (collector.candidateFacts ?? []).map((f) => f.text ?? "").filter(Boolean);
}

function tierFromText(text: string, region: string): "top40" | "top10" | "number_one" | "mentioned" {
  const slice = text;
  if (/#1|number one|no\.?\s*1/i.test(slice)) return "number_one";
  if (/top\s*10|#([2-9]|10)\b/i.test(slice)) return "top10";
  if (/top\s*40|chart hit|peaked|peak/i.test(slice)) return "top40";
  if (new RegExp(region, "i").test(slice)) return "mentioned";
  return "mentioned";
}

export function extractInternationalHints(
  collector: CollectorPackage | null,
): ChartJourneyInternationalPayload | null {
  const texts = factTexts(collector);
  const combined = texts.join(" ");
  const regions: ChartJourneyInternationalPayload["regions"] = [];

  for (const region of INTL_REGIONS) {
    if (!region.pattern.test(combined)) continue;
    regions.push({
      code: region.code,
      label: region.label,
      tier: tierFromText(combined, region.label),
    });
  }

  if (regions.length === 0) return null;

  const intlFact = texts.find((t) => /UK|Canada|Australia|international|world/i.test(t));
  return {
    regions,
    summary: intlFact ?? "International chart success beyond the home market.",
  };
}

export function extractAwardsHints(collector: CollectorPackage | null): ChartJourneyAwardsPayload | null {
  const texts = factTexts(collector);
  const combined = texts.join(" ");
  const milestones: ChartJourneyAwardsPayload["milestones"] = [];

  if (/gold/i.test(combined)) milestones.push({ label: "Gold certification", kind: "gold" });
  if (/platinum|multi-platinum|multi platinum/i.test(combined)) {
    milestones.push({ label: "Platinum certification", kind: "platinum" });
  }
  if (/grammy/i.test(combined)) milestones.push({ label: "Grammy recognition", kind: "grammy" });
  if (/hall of fame/i.test(combined)) milestones.push({ label: "Hall of Fame", kind: "hall_of_fame" });
  if (/RIAA/i.test(combined)) milestones.push({ label: "RIAA certification", kind: "riaa" });

  const chartBlock = collector?.charts as { certifications?: string[] } | undefined;
  const certs = chartBlock?.certifications ?? [];
  for (const cert of certs) {
    const label = typeof cert === "string" ? cert : String(cert);
    if (/gold/i.test(label) && !milestones.some((m) => m.kind === "gold")) {
      milestones.push({ label, kind: "gold" });
    }
    if (/platinum/i.test(label) && !milestones.some((m) => m.kind === "platinum")) {
      milestones.push({ label, kind: "platinum" });
    }
  }

  if (milestones.length === 0) return null;
  return { milestones };
}

export function extractLegacyHints(
  collector: CollectorPackage | null,
  weeksOnChart: number,
): ChartJourneyLegacyPayload | null {
  const texts = factTexts(collector);
  const threads: string[] = [];

  for (const text of texts) {
    if (/cover|film|commercial|television|TV|stream|playlist|sampled|remix/i.test(text)) {
      threads.push(text.length > 120 ? `${text.slice(0, 117)}…` : text);
    }
  }

  if (weeksOnChart >= 20) {
    threads.push(`Still remembered — ${weeksOnChart} weeks on the chart left a lasting footprint.`);
  }

  if (threads.length === 0) return null;

  return {
    headline: "The song kept living",
    threads: threads.slice(0, 4),
  };
}
