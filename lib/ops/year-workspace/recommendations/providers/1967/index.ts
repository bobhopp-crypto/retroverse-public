import type { YearRecommendationProvider } from "../../types";

import { ALBUMS_1967 } from "./albums";
import { BUMPERS_1967 } from "./bumpers";
import { COMMERCIALS_1967 } from "./commercials";
import { EVENTS_1967 } from "./events";
import { PROMOS_1967 } from "./promos";
import { TV_CLIPS_1967 } from "./tv_clips";

export const CURATED_1967: YearRecommendationProvider = {
  albums: ALBUMS_1967,
  commercials: COMMERCIALS_1967,
  tv_clips: TV_CLIPS_1967,
  bumpers: BUMPERS_1967,
  promos: PROMOS_1967,
  events: EVENTS_1967,
};
