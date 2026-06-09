export type CreativeLabPanel = "projects" | "styles" | "presets" | "pass-lab";

export type CreativeLabSearchParams = {
  panel?: CreativeLabPanel;
  project?: string;
};

export function buildCreativeLabHref(params: CreativeLabSearchParams = {}): string {
  const sp = new URLSearchParams();
  if (params.panel) sp.set("panel", params.panel);
  if (params.project) sp.set("project", params.project);
  const q = sp.toString();
  return q ? `/ops/creative-lab?${q}` : "/ops/creative-lab";
}
