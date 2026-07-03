export type MissionConfidenceTier = "high" | "medium" | "low";

export function confidenceTier(confidencePct: number): MissionConfidenceTier {
  if (confidencePct > 85) return "high";
  if (confidencePct >= 60) return "medium";
  return "low";
}

export function tierLabel(tier: MissionConfidenceTier): string {
  if (tier === "high") return "High confidence";
  if (tier === "medium") return "Review";
  return "Research needed";
}

export function tierActionLabel(tier: MissionConfidenceTier, hasSelection: boolean): string {
  if (tier === "high") return "Approve";
  if (tier === "medium") return hasSelection ? "Review & approve" : "Review & approve";
  return hasSelection ? "Approve selection" : "Research needed";
}

export function tierCanPrimaryApprove(tier: MissionConfidenceTier): boolean {
  return tier === "high" || tier === "medium";
}
