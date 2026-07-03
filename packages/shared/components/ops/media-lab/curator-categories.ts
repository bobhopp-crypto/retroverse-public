import type { ContentType } from "@/lib/ops/media-lab/editorial/transcript-suggestions";

export type CuratorCategory = {
  key: string;
  label: string;
  contentType: ContentType;
  help: string;
};

/** Curator-facing categories — map to canonical ContentType on save. */
export const CURATOR_CATEGORIES: CuratorCategory[] = [
  { key: "1", label: "TV Intro", contentType: "Promo", help: "Show open, title sequence, or program intro." },
  { key: "2", label: "Commercial", contentType: "Commercial", help: "Advertisement or sponsor message." },
  { key: "3", label: "Promo", contentType: "Promo", help: "Network promotion or teaser." },
  { key: "4", label: "Performance", contentType: "Performance", help: "Musical performance or live act." },
  { key: "5", label: "Speech", contentType: "Acceptance Speech", help: "Acceptance speech or remarks." },
  { key: "6", label: "Interview", contentType: "Interview", help: "Interview segment or Q&A." },
  { key: "7", label: "News", contentType: "News", help: "News report or topical segment." },
  {
    key: "8",
    label: "Bumper",
    contentType: "Promo",
    help: "Transition material between songs, years, themes, or segments — intros, IDs, footage, trailers.",
  },
  { key: "9", label: "Station ID", contentType: "Station ID", help: "Call letters or local station branding." },
  { key: "0", label: "Other", contentType: "Presenter", help: "Useful clip that does not fit other categories." },
];

const TYPE_TO_CURATOR_LABEL = new Map<ContentType, string>(
  CURATOR_CATEGORIES.map((c) => [c.contentType, c.label]),
);

export function curatorLabelForContentType(type: ContentType): string {
  return TYPE_TO_CURATOR_LABEL.get(type) ?? type;
}

export function curatorCategoryForKey(key: string): CuratorCategory | null {
  return CURATOR_CATEGORIES.find((c) => c.key === key) ?? null;
}
