import type { ContentType } from "@/lib/ops/media-lab/editorial/transcript-suggestions";

export type FocusWorkstationType = {
  key: string;
  type: ContentType;
  label: string;
  help: string;
};

/** Keyboard 1–8 map for rapid clip classification. */
export const FOCUS_WORKSTATION_TYPES: FocusWorkstationType[] = [
  {
    key: "1",
    type: "Commercial",
    label: "Commercial",
    help: "Advertisement or sponsor message.",
  },
  {
    key: "2",
    type: "Performance",
    label: "Performance",
    help: "Musical performance.",
  },
  {
    key: "3",
    type: "Promo",
    label: "Promo",
    help: "Network promotion or teaser.",
  },
  {
    key: "4",
    type: "Award",
    label: "Award",
    help: "Award presentation or winner announcement.",
  },
  {
    key: "5",
    type: "Acceptance Speech",
    label: "Speech",
    help: "Acceptance speech or thank-you remarks.",
  },
  {
    key: "6",
    type: "Interview",
    label: "Interview",
    help: "Interview segment or Q&A.",
  },
  {
    key: "7",
    type: "News",
    label: "News",
    help: "News report or topical segment.",
  },
  {
    key: "8",
    type: "Station ID",
    label: "Station ID",
    help: "Call letters, local station branding.",
  },
];

export function focusTypeForKey(key: string): ContentType | null {
  return FOCUS_WORKSTATION_TYPES.find((t) => t.key === key)?.type ?? null;
}
