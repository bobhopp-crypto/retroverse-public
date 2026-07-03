/**
 * Editor page context — serializable props passed from server pages to client components.
 */

import type { CollectorPackage } from "@/lib/ops/studio/collector/package-contract";

import type { EditorOfficeView } from "./office-presentation";
import type { EditorStoryView } from "./presentation";
import type { EditorLibraryCard, EditorStoryPackage } from "./types";

export type EditorPackagePageContext = {
  rvtr: string;
  collector: CollectorPackage | null;
  story: EditorStoryPackage | null;
  view: EditorStoryView | null;
  office: EditorOfficeView | null;
  seeded: boolean;
  prev: EditorLibraryCard | null;
  next: EditorLibraryCard | null;
};
