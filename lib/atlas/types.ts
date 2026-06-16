export type TerritoryStatus = "Deploy Ready" | "Active" | "Quiet" | "Uncharted";

export type TerritoryCard = {
  id: string;
  label: string;
  slug: string | null;
  owned: number;
  missing: number;
  coveragePct: number;
  exhibitDepthPct: number | null;
  activeMission: string | null;
  status: TerritoryStatus;
  emphasized?: boolean;
};

export type CampaignKey = "covers" | "albums" | "commentary" | "tv" | "movies";

export type CampaignBar = {
  key: CampaignKey;
  label: string;
  pct: number;
};

export type AtlasMission = {
  rank: number;
  verb: "Conquer" | "Fortify" | "Scout";
  artist: string;
  title: string;
  rvtr: string;
  playCount: number;
  completenessPct: number;
  priority: number;
  active?: boolean;
};

export type Territory1970sData = {
  owned: number;
  missing: number;
  totalOnShelf: number;
  mappedPct: number;
  complete: number;
  partial: number;
  uniqueRvtr: number;
  campaigns: CampaignBar[];
  missions: AtlasMission[];
  discoveries: string[];
};

export type RealitiesAlignment = "Matched" | "Different" | "Can't Compare";
export type RealitiesSync = "Good To Go" | "Sync First" | "Not Ready";

export type AtlasRealities = {
  studio: {
    headline: string;
    showFloor: string;
    program: string;
    blueprint: string;
  };
  stage: {
    headline: string;
    showFloor: string;
    program: string;
    blueprint: string;
  };
  alignment: RealitiesAlignment;
  syncStatus: RealitiesSync;
  deployReadiness: RealitiesSync;
};

export type WorkshopTool = {
  label: string;
  href: string;
};

export type WorkshopRoom = {
  id: string;
  title: string;
  status: string;
  tools: WorkshopTool[];
  tone: "shelf" | "missions" | "prep" | "event" | "create" | "surgery";
};
