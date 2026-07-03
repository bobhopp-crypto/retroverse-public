import type { PlayerIntelligenceProfile } from "@/lib/ops/allstar/intelligence/types";
import type { PlayerLeagueProfile } from "@/lib/ops/allstar/league/types";

import { AllStarPlayerTabs } from "./AllStarPlayerTabs";

type Props = {
  profile: PlayerIntelligenceProfile;
  league: PlayerLeagueProfile;
};

export function AllStarPlayerPanel({ profile, league }: Props) {
  return <AllStarPlayerTabs profile={profile} league={league} />;
}
