export type CreativeLabPanel =
  | "workstation"
  | "projects"
  | "styles"
  | "presets"
  | "pass-lab"
  | "assets";

const ADVANCED_PANELS: CreativeLabPanel[] = ["projects", "styles", "presets", "pass-lab", "assets"];

export function isAdvancedPanel(panel: CreativeLabPanel | null | undefined): boolean {
  return Boolean(panel && ADVANCED_PANELS.includes(panel));
}

export type CreativeLabSearchParams = {
  panel?: CreativeLabPanel;
  project?: string;
};

export function buildCreativeLabHref(params: CreativeLabSearchParams = {}): string {
  const sp = new URLSearchParams();
  if (params.panel && params.panel !== "workstation") sp.set("panel", params.panel);
  if (params.project) sp.set("project", params.project);
  const q = sp.toString();
  return q ? `/ops/creative-lab?${q}` : "/ops/creative-lab";
}
