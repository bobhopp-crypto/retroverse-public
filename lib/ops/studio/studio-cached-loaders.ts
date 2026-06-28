import "server-only";

import { cache } from "react";

import { buildPipelineHealthSnapshot } from "./pipeline-snapshot";
import { loadPublisherStore } from "./publisher/store";

/** One publisher store read per request — avoids parsing 5MB JSON hundreds of times. */
export const getPublisherStoreCached = cache(loadPublisherStore);

/** One pipeline health build per request. */
export const getPipelineHealthCached = cache(buildPipelineHealthSnapshot);
