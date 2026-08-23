import 'server-only';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { retroverseDataRoot } from '@/lib/retroverse-data-root';
import type { WoodstockPresentationAsset } from './woodstock-presentation-types';
export type { WoodstockPresentationAsset } from './woodstock-presentation-types';

const root = () => join(retroverseDataRoot(), 'bobos', 'presentation-assets', 'woodstock');
const bundledRoot = () => join(process.cwd(), 'data', 'bobos', 'presentation-assets', 'woodstock');

export async function loadWoodstockPresentationAsset(vdjIdentity: string): Promise<WoodstockPresentationAsset | null> {
  const key = vdjIdentity.trim().toUpperCase();
  if (!/^VDJ:[0-9A-F]{16}$/.test(key)) return null;
  try {
    let raw: string;
    try { raw = await readFile(join(bundledRoot(), 'index.json'), 'utf8'); }
    catch { raw = await readFile(join(root(), 'index.json'), 'utf8'); }
    const index = JSON.parse(raw) as { assets?: WoodstockPresentationAsset[] };
    return index.assets?.find((asset) => asset.vdjIdentity.toUpperCase() === key) ?? null;
  } catch { return null; }
}
