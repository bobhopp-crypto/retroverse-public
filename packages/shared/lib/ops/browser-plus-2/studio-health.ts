import type { Bp2Row, Bp2StudioHealth } from "./types";
import { isActiveVideoRow } from "./status";
import { buildBp2StudioHealth } from "./studio-metrics-adapter";

export function buildStudioHealth(rows: Bp2Row[]): Bp2StudioHealth {
  return buildBp2StudioHealth(rows.filter(isActiveVideoRow));
}
