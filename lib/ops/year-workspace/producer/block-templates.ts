import type { ProducerBlockTemplateId } from "./types";

export type ProducerBlockTemplate = {
  id: ProducerBlockTemplateId;
  label: string;
  title: string;
  notes: string;
};

export const PRODUCER_BLOCK_TEMPLATES: ProducerBlockTemplate[] = [
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

export const PRODUCER_STARTER_BLOCKS: { title: string; notes: string }[] = [
  { title: "Opening", notes: "Cold open · station ID · first energy" },
  {
    title: "Music Block",
    notes: "Billboard spine · singalongs · dance floor",
  },
  {
    title: "Commercial Break",
    notes: "Period ads · sponsors · bumpers in and out",
  },
  { title: "TV Memory", notes: "Clips · promos · couch moments" },
  { title: "News Break", notes: "Headlines · wire · local color" },
  {
    title: "Feature Segment",
    notes: "Sports · movies · deep cut · event hook",
  },
  { title: "Closing", notes: "Last songs · sign-off · night cap" },
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
