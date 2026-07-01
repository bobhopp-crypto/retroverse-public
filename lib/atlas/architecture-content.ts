/** Permanent Atlas architecture documentation — static, no AI generation. */

export type ArchitectureSection = {
  id: string;
  title: string;
  body?: string;
  items?: Array<{ term: string; detail: string }>;
};

export type ArchitectureDoc = {
  updatedAt: string;
  sprint: string;
  milestone: string;
  phase: string;
  philosophy: string[];
  sections: ArchitectureSection[];
};

export const ATLAS_ARCHITECTURE: ArchitectureDoc = {
  updatedAt: "2026-06-29",
  sprint: "Retroverse Consolidation 3.0 — Phase 2",
  milestone: "S-009 — Multi-Worker Execution Engine (complete in tree)",
  phase: "Studio Phase 9 complete — no further Studio milestones approved",
  philosophy: [
    "Retroverse is a canonical music graph — discovery UI sits on canonical truth.",
    "Public = editorial cream/teal. Local Studio = Command Center dark blue.",
    "Filesystem before database for operator browse surfaces.",
    "One Command Center, one Atlas encyclopedia, one Database Explorer.",
    "Studio pipeline JSON on disk is authoritative for Collector → Editor → Director → Publisher.",
    "Postgres graph is authoritative for public search, song pages, and chart relationships.",
  ],
  sections: [
    {
      id: "product",
      title: "Current Product Architecture",
      items: [
        {
          term: "Public",
          detail:
            "retroverse.live — Home, Search, Song, Artist, Album, Year, Live. Graph-backed discovery and editorial song experiences.",
        },
        {
          term: "Local Studio",
          detail:
            "localhost — Command Center (/ops), Atlas encyclopedia, Database Explorer, Script Launcher, Diagnostics.",
        },
        {
          term: "Shared Data",
          detail:
            "RETROVERSE_DATA (~47 GB external), bundled repo data/, Postgres retroverse graph, search index exports, reports/.",
        },
      ],
    },
    {
      id: "pipeline",
      title: "Pipeline",
      items: [
        {
          term: "Collector",
          detail:
            "Expands the Retrograph per RVTR — facts, sources, media. Artifacts: research-department/{RVTR}/collector.json. UI: /ops/studio/collector (edit), /ops/library (browse).",
        },
        {
          term: "Editor",
          detail:
            "Refines the Retrograph — normalize, dedupe, score confidence. Artifacts: editor.json. UI: /ops/studio/editor.",
        },
        {
          term: "Director",
          detail:
            "Designs patron experiences from the Retrograph — never mutates knowledge. Artifacts: director.json. UI: /ops/studio/director.",
        },
        {
          term: "Publisher",
          detail:
            "Publishes experiences from approved Director output. UI: /ops/studio/publisher.",
        },
        {
          term: "Live",
          detail:
            "Show runtime — Live Control (/ops/live-control), Sunday Nights prep, Event Control for homepage cover story. Bridge health via RETROVERSE_DATA/live/.",
        },
      ],
    },
    {
      id: "database",
      title: "Database",
      body:
        "Canonical artists, albums, tracks, and chart history live in local Postgres (retroverse DB). Public search and song pages read the graph. Database Explorer (/database-explorer) is the read-only operator view — no schema changes from the UI.",
    },
    {
      id: "storage",
      title: "Storage Locations",
      items: [
        {
          term: "Studio pipeline",
          detail: "data/ops/intelligence/research-department/{RVTR}/ — collector, editor, director artifacts.",
        },
        {
          term: "Intelligence legacy",
          detail: "RETROVERSE_DATA/ops/intelligence/packages/*.json — pre-Studio SongPackage era.",
        },
        {
          term: "Retroverse Tags",
          detail: "ops/retroverse-tags-by-rvtr.json — canonical tag truth keyed by RVTR.",
        },
        {
          term: "Atlas caches",
          detail: "data/ops/atlas/system-map-cache.json — System Map scan cache.",
        },
        {
          term: "Reports",
          detail: "reports/ — audits, batch logs, generated markdown/json.",
        },
        {
          term: "Live state",
          detail: "RETROVERSE_DATA/live/processes.json — bridge PID manifest.",
        },
      ],
    },
    {
      id: "naming",
      title: "Naming Rules",
      items: [
        { term: "RVTR", detail: "Canonical track identity." },
        { term: "RVAR", detail: "Canonical artist." },
        { term: "RVAL", detail: "Canonical album." },
        { term: "Command Center", detail: "Operator hub at /ops — the only ops home." },
        { term: "Atlas", detail: "Encyclopedia at /ops/atlas/* — Library, Scripts, System Map, Architecture." },
        { term: "Database Explorer", detail: "Postgres graph explorer at /database-explorer." },
      ],
    },
  ],
};
