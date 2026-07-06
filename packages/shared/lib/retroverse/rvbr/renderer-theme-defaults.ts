/**
 * Zero-dependency default renderer vars.
 *
 * Split out of `renderer-theme.ts` so client components (e.g. UniversalRenderer)
 * can import the fallback theme without pulling in `canon-profiles.ts` →
 * `import-canon.ts`, which reads era canon JSON via `node:fs` at module scope.
 * That chain is server-only and breaks the client webpack bundle if dragged in
 * through a value import.
 */

/** Baseline when era cannot be resolved — matches legacy universal renderer look. */
export const RVBR_RENDERER_DEFAULT_VARS: Record<string, string> = {
  "--urx-cream": "#f7ead0",
  "--urx-paper": "#fffaf0",
  "--urx-ink": "#172923",
  "--urx-teal": "#0f6b66",
  "--urx-orange": "#e05a32",
  "--urx-red": "#b8372f",
  "--urx-accent-soft": "#ffcdb0",
  "--urx-border-width": "3px",
  "--urx-border": "3px solid #172923",
  "--urx-bg-gradient": "linear-gradient(180deg, #f7ead0 0%, #efe0c4 100%)",
  "--urx-hero-placeholder": "linear-gradient(155deg, #0f6b66, #0a3d3b)",
  "--urx-hero-wash": "linear-gradient(160deg, rgba(224,90,50,0.50), rgba(15,107,102,0.65))",
  "--urx-hero-scrim":
    "linear-gradient(180deg, rgba(15,30,26,0.35) 0%, rgba(15,30,26,0.25) 40%, rgba(12,22,19,0.93) 100%)",
  "--urx-font-headline": 'system-ui, -apple-system, "Segoe UI", sans-serif',
  "--urx-font-body": 'system-ui, -apple-system, "Segoe UI", sans-serif',
  "--urx-card-radius": "16px",
  "--urx-stat-radius": "12px",
  "--urx-button-radius": "999px",
  "--urx-spacing-scale": "1",
  "--urx-shadow-offset": "4px",
  "--urx-shadow-color": "rgba(23,41,35,0.12)",
  "--urx-divider-color": "#e05a32",
  "--urx-pulse-duration": "1.6s",
  "--urx-paper-rgb": "255,250,240",
  "--urx-ink-rgb": "23,41,35",
};
