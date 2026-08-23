export type WoodstockPresentationAsset = {
  assetId: string; vdjIdentity: string; sourceFilename: string;
  presentationType: 'PERFORMANCE'|'SPOKEN_DOCUMENTARY'|'MIXED'|'VISUAL_CONTEXT';
  event: 'WOODSTOCK 1969'; title: string; subtitle?: string | null;
  hero: { file: string; source: string; timestampSeconds: number };
  slides: Array<{ kind: string; title: string; body: string }>;
  artistRelationship?: string | null; evidenceReferences: string[];
  createdAt: string; updatedAt: string;
};
export function woodstockHeroUrl(identity: string): string {
  return `/api/experience/visual-asset?rvtr=${encodeURIComponent(identity)}&file=hero.jpg`;
}
