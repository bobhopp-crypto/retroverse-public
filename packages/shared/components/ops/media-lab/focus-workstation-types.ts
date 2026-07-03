import type { ContentType } from "@/lib/ops/media-lab/editorial/transcript-suggestions";

import { CURATOR_CATEGORIES, curatorCategoryForKey } from "./curator-categories";

export type FocusWorkstationType = {
  key: string;
  type: ContentType;
  label: string;
  help: string;
};

export const FOCUS_WORKSTATION_TYPES: FocusWorkstationType[] = CURATOR_CATEGORIES.map(
  (c) => ({
    key: c.key,
    type: c.contentType,
    label: c.label,
    help: c.help,
  }),
);

export function focusTypeForKey(key: string): ContentType | null {
  return curatorCategoryForKey(key)?.contentType ?? null;
}
