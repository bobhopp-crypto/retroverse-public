import type {
  ExperienceInventorySection,
  ExperienceInventorySource,
  InventorySectionStatus,
} from "./types";

export type SectionDefinition<T> = {
  id: string;
  label: string;
  source: ExperienceInventorySource;
  load: () => Promise<T>;
  /**
   * Classify a successful load into available / missing / empty / not-applicable.
   * Defaults: null/undefined → missing; empty array → empty; else available.
   */
  classify?: (data: T) => {
    status: InventorySectionStatus;
    summary?: string;
    count?: number;
    data?: unknown;
  };
};

function defaultClassify<T>(data: T): {
  status: InventorySectionStatus;
  summary?: string;
  count?: number;
  data?: unknown;
} {
  if (data == null) {
    return { status: "missing", summary: "No data returned", data: null };
  }
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { status: "empty", summary: "Empty collection", count: 0, data };
    }
    return {
      status: "available",
      summary: `${data.length} item(s)`,
      count: data.length,
      data,
    };
  }
  if (typeof data === "object") {
    const keys = Object.keys(data as object);
    if (keys.length === 0) {
      return { status: "empty", summary: "Empty object", count: 0, data };
    }
  }
  return { status: "available", summary: "Present", data };
}

/** Isolate one subsystem lookup so failures never crash the inventory. */
export async function inspectSection<T>(
  definition: SectionDefinition<T>,
): Promise<ExperienceInventorySection> {
  try {
    const data = await definition.load();
    const classified = definition.classify
      ? definition.classify(data)
      : defaultClassify(data);
    return {
      id: definition.id,
      label: definition.label,
      status: classified.status,
      source: definition.source,
      summary: classified.summary,
      count: classified.count,
      data: classified.data,
    };
  } catch (error) {
    return {
      id: definition.id,
      label: definition.label,
      status: "error",
      source: definition.source,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
