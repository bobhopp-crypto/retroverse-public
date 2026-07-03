export type RvbrCanonEra = {
  slug: string;
  years: string;
  title: string;
  subtitle?: string;
  summary?: string;
  accent?: string;
  sections?: Record<string, string>;
  definingAlbums?: string[];
  definingSongs?: string[];
  chronology?: Record<string, unknown>[];
};

export type RvbrCanonFile = {
  source?: string;
  eras: RvbrCanonEra[];
};

export type RvbrVisualIdentity = {
  canonSource: string;
  title: string;
  subtitle?: string;
  accent?: string;
  sections?: Record<string, string>;
  definingAlbums?: string[];
  definingSongs?: string[];
  chronology?: Record<string, unknown>[];
};

export type RvbrPromptFragments = {
  designRules?: string;
  creativeLabPresets?: string[];
  visualWorlds?: string[];
  passPromptModules?: string[];
  notes?: string;
};

export type RvbrProfile = {
  id: string;
  retroverseEraId: string;
  slug: string;
  name: string;
  eraStartYear: number;
  eraEndYear: number;
  narrative: string | null;
  visualIdentity: RvbrVisualIdentity;
  promptFragments: RvbrPromptFragments;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};
