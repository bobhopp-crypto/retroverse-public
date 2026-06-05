import type { ProducerBlockTemplateId, ProducerEraId } from "./types";

export type ProducerBlockTemplate = {
  id: ProducerBlockTemplateId;
  label: string;
  title: string;
  notes: string;
  eraId?: ProducerEraId;
};

export const PRODUCER_BLOCK_TEMPLATES: ProducerBlockTemplate[] = [
  {
    id: "segment_1967",
    label: "Create 1967 Segment",
    title: "1967 Music Segment",
    notes: "1967 spine · period tone",
    eraId: "1967",
  },
  {
    id: "segment_1978",
    label: "Create 1978 Segment",
    title: "1978 TV Segment",
    notes: "1978 couch · disco · network TV",
    eraId: "1978",
  },
  {
    id: "segment_1992",
    label: "Create 1992 Segment",
    title: "1992 Feature Segment",
    notes: "1992 feature · news · pop culture",
    eraId: "1992",
  },
  {
    id: "music_segment",
    label: "Music Segment",
    title: "Music Block",
    notes: "Billboard spine · singalongs · dance floor",
  },
  {
    id: "commercial_break",
    label: "Commercial Break",
    title: "Commercial Break",
    notes: "Period ads · sponsors · bumpers in and out",
  },
  {
    id: "tv_memory",
    label: "TV Memory",
    title: "TV Memory",
    notes: "Clips · promos · couch moments",
  },
  {
    id: "news_segment",
    label: "News Segment",
    title: "News Break",
    notes: "Headlines · wire · local color",
  },
  {
    id: "feature_segment",
    label: "Feature Segment",
    title: "Feature Segment",
    notes: "Sports · movies · deep cut · event hook",
  },
  {
    id: "custom",
    label: "Custom",
    title: "Custom Block",
    notes: "",
  },
];

export const PRODUCER_STARTER_BLOCKS: {
  title: string;
  notes: string;
  eraId: ProducerEraId;
}[] = [
  {
    title: "Opening",
    notes: "Cold open · station ID · first energy",
    eraId: "mixed",
  },
  {
    title: "Music Block",
    notes: "Billboard spine · singalongs · dance floor",
    eraId: "mixed",
  },
  {
    title: "Commercial Break",
    notes: "Period ads · sponsors · bumpers in and out",
    eraId: "mixed",
  },
  { title: "TV Memory", notes: "Clips · promos · couch moments", eraId: "mixed" },
  { title: "News Break", notes: "Headlines · wire · local color", eraId: "mixed" },
  {
    title: "Feature Segment",
    notes: "Sports · movies · deep cut · event hook",
    eraId: "mixed",
  },
  { title: "Closing", notes: "Last songs · sign-off · night cap", eraId: "mixed" },
];

/** Legacy v1 section order and metadata for migration. */
export const PRODUCER_LEGACY_V1_BLOCKS: {
  id: import("./types").ProducerTimelineLegacyBlockId;
  title: string;
  notes: string;
}[] = [
  { id: "opening", title: "Opening", notes: "Cold open · station ID · first energy" },
  {
    id: "music_block",
    title: "Music Block",
    notes: "Billboard spine · singalongs · dance floor",
  },
  {
    id: "commercial_break",
    title: "Commercial Break",
    notes: "Period ads · sponsors · bumpers in and out",
  },
  { id: "tv_memory", title: "TV Memory", notes: "Clips · promos · couch moments" },
  {
    id: "news_moment",
    title: "News Break",
    notes: "Headlines · wire · local color",
  },
  {
    id: "feature_segment",
    title: "Feature Segment",
    notes: "Sports · movies · deep cut · event hook",
  },
  { id: "closing", title: "Closing", notes: "Last songs · sign-off · night cap" },
];

export function templateById(
  id: ProducerBlockTemplateId,
): ProducerBlockTemplate | undefined {
  return PRODUCER_BLOCK_TEMPLATES.find((t) => t.id === id);
}
