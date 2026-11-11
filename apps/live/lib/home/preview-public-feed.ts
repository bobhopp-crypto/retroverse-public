// Explicit local-preview adapter. No credentials, redirects, or caller URLs.
import { normalizePublicNotes, normalizeVdjYear } from '@/lib/sunday-nights/public-notes';
const ENDPOINT = 'https://retroverse.live/api/sunday-nights/current';
type Env = Record<string, string | undefined>;
export function previewFeedAllowed(req: Request, env: Env): boolean {
  if (env.RETROVERSE_PREVIEW_PUBLIC_FEED !== '1' || env.VERCEL !== undefined || env.VERCEL_ENV !== undefined) return false;
  const url = new URL(req.url), host = req.headers.get('host');
  if (!host) return false;
  let requested: URL;
  try { requested = new URL(`http://${host}`); } catch { return false; }
  // Next normalizes a loopback Request URL to localhost while preserving Host.
  // Permit only equivalent allowlisted loopback names at the same port. This is
  // a host guard, not peer authentication: the preview must bind to 127.0.0.1.
  const loopback = ['127.0.0.1', 'localhost'];
  const forwardedHost = req.headers.get('x-forwarded-host');
  return url.protocol === 'http:' && loopback.includes(url.hostname) && loopback.includes(requested.hostname) && host === requested.host && requested.port === url.port && !requested.username && !requested.password && !req.headers.has('forwarded') && (forwardedHost === null || forwardedHost === host);
}
function record(v: unknown): Record<string, unknown> { return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; }
function text(v: unknown, limit = 300): string | null { return typeof v === 'string' && v.length <= limit ? v : null; }
function stamp(v: unknown): string | null { const s = text(v, 40); return s && Number.isFinite(Date.parse(s)) ? s : null; }
function year(v: unknown): number | null { return typeof v === 'number' && Number.isInteger(v) && v >= 1900 && v <= 2100 ? v : null; }
function hero(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 2048 || /[\\\u0000-\u0020]/.test(v)) return null;
  try {
    const u = new URL(v, 'https://retroverse.live');
    if (u.origin !== 'https://retroverse.live' || u.username || u.password || u.hash || u.pathname !== '/api/experience/visual-asset' || u.searchParams.getAll('file').length !== 1 || u.searchParams.getAll('rvtr').length !== 1 || u.searchParams.get('file') !== 'hero-video.jpg' || !/^(?:VDJ-[0-9a-f]{16}|RVTR[0-9]{6})$/i.test(u.searchParams.get('rvtr') || '') || [...u.searchParams.keys()].some(key => key !== 'file' && key !== 'rvtr')) return null;
    return `https://retroverse.live/api/experience/visual-asset?rvtr=${encodeURIComponent(u.searchParams.get('rvtr')!)}&file=hero-video.jpg`;
  } catch { return null; }
}
export function sanitizePreviewFeed(value: unknown) {
  const p = record(value), l = record(p.live), song = record(p.publicSong);
  const id = typeof l.rvtr === 'string' && /^RVTR\d{6}$/.test(l.rvtr) ? l.rvtr : null;
  return { ...(typeof p.identityOnly === 'boolean' ? { identityOnly: p.identityOnly } : {}), currentTrackId: id, live: !p.live || typeof p.live !== 'object' || Array.isArray(p.live) ? null : {
    rvtr: id, title: text(l.title), artist: text(l.artist), year: year(l.year),
    ...(Object.hasOwn(l, 'vdjYear') ? { vdjYear: normalizeVdjYear(l.vdjYear) } : {}),
    ...(Object.hasOwn(l, 'researchSelectionToken') ? { researchSelectionToken: typeof l.researchSelectionToken === 'string' && /^[a-f0-9]{64}$/.test(l.researchSelectionToken) ? l.researchSelectionToken : null } : {}),
    publicNotes: normalizePublicNotes(l.publicNotes, { title: text(l.title) ?? undefined, artist: text(l.artist) ?? undefined, rvtr: id }),
    playing: typeof l.playing === 'boolean' ? l.playing : null,
    bridgeTimestamp: stamp(l.bridgeTimestamp), startedAt: stamp(l.startedAt), source: l.source === 'bridge' ? 'bridge' : null,
  }, updatedAt: stamp(p.updatedAt), publicSong: { heroUrl: hero(song.heroUrl) },
  publicState: { version: 2, source: 'preview-public-feed' } };
}
export async function loadPreviewPublicFeed(req: Request, env: Env, fetcher: typeof fetch = fetch) {
  if (env.RETROVERSE_PREVIEW_PUBLIC_FEED !== '1') return undefined;
  if (!previewFeedAllowed(req, env)) throw new Error('Preview feed not permitted');
  const views = new URL(req.url).searchParams.getAll('view');
  if (views.length > 1 || (views.length === 1 && !['identity', 'full'].includes(views[0]))) throw new Error('Preview view not permitted');
  const endpoint = views[0] === 'identity' ? `${ENDPOINT}?view=identity` : ENDPOINT;
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 5000);
  try {
    const r = await fetcher(endpoint, { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal });
    if (!r.ok || !r.headers.get('content-type')?.includes('application/json') || !r.body) throw new Error('Preview feed unavailable');
    const reader = r.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
    try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 262144) { await reader.cancel(); throw new Error('Preview response too large'); } chunks.push(value); } }
    finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return sanitizePreviewFeed(JSON.parse(new TextDecoder().decode(bytes)));
  } finally { clearTimeout(timer); }
}
