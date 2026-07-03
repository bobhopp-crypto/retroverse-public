import type { PageStatus } from "./whiteboard-data";

/** Standard blueprint fields — every page uses this shape before implementation. */
export type Blueprint = {
  title: string;
  purpose: string;
  primaryUser: string;
  mustAlwaysDo: string[];
  navigationIn: string[];
  navigationOut: string[];
  displayPriority?: string[];
  liveTrigger?: string;
  override?: string;
  notes?: string[];
  status: PageStatus;
};

export const BLUEPRINT_TEMPLATE_LABELS = {
  purpose: "Purpose",
  primaryUser: "Primary User",
  mustAlwaysDo: "Must Always Do",
  navigationIn: "Navigation In",
  navigationOut: "Navigation Out",
  displayPriority: "Display Priority",
  liveTrigger: "Live Trigger",
  override: "Override",
  notes: "Notes",
  status: "Status",
} as const;

const TBD = "— Not yet defined";

export function stubBlueprint(
  title: string,
  purpose: string,
  primaryUser: string,
  status: PageStatus = "not-started",
): Blueprint {
  return {
    title,
    purpose,
    primaryUser,
    mustAlwaysDo: [TBD],
    navigationIn: [TBD],
    navigationOut: [TBD],
    status,
  };
}
