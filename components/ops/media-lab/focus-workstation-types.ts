import type { ContentType } from "@/lib/ops/media-lab/editorial/transcript-suggestions";

export type FocusWorkstationType = {
  key: string;
  type: ContentType;
  label: string;
};

/** Keyboard 1–8 map for rapid clip classification. */
export const FOCUS_WORKSTATION_TYPES: FocusWorkstationType[] = [
  { key: "1", type: "Commercial", label: "Commercial" },
  { key: "2", type: "Performance", label: "Performance" },
  { key: "3", type: "Promo", label: "Promo" },
  { key: "4", type: "Award", label: "Award" },
  { key: "5", type: "Acceptance Speech", label: "Speech" },
  { key: "6", type: "Interview", label: "Interview" },
  { key: "7", type: "News", label: "News" },
  { key: "8", type: "Station ID", label: "Station ID" },
];

export function focusTypeForKey(key: string): ContentType | null {
  return FOCUS_WORKSTATION_TYPES.find((t) => t.key === key)?.type ?? null;
}
