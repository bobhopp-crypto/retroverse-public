import type { AllStarSnapshot } from "../types";
import type { PlayerIntelligenceProfile, PreservationMilestone } from "./types";

export function buildPreservationMilestones(
  snapshot: AllStarSnapshot,
  profiles: PlayerIntelligenceProfile[],
): PreservationMilestone[] {
  const preserved = snapshot.stats.processedScans;
  const hofPreserved = profiles.filter((p) => p.record.hallOfFame).length;
  const totalHofInCollection = snapshot.discs.filter((d) =>
    profiles.some((p) => p.record.discId === d.id && p.record.hallOfFame),
  ).length;
  const total = snapshot.stats.totalScans;

  const counts = [
    { id: "first-10", label: "10 Players Preserved", target: 10, description: "Ten discs preserved in the living archive." },
    { id: "first-25", label: "25 Players Preserved", target: 25, description: "Quarter-century of players reconstructed." },
    { id: "first-50", label: "50 Players Preserved", target: 50, description: "Half a hundred Cadaco profiles saved." },
    { id: "first-100", label: "100 Players Preserved", target: 100, description: "Major preservation milestone — 100 players." },
    {
      id: "hof-complete",
      label: "Hall of Fame Set Complete",
      target: Math.max(totalHofInCollection, 1),
      current: hofPreserved,
      description: "Every identified Hall of Fame disc preserved.",
    },
    {
      id: "collection-complete",
      label: "Full Collection Preserved",
      target: total,
      description: "Full scan library reconstructed and archived.",
    },
  ];

  return counts.map((item) => ({
    id: item.id,
    label: item.label,
    target: item.target,
    current: item.current ?? preserved,
    unlocked: (item.current ?? preserved) >= item.target,
    description: item.description,
  }));
}
