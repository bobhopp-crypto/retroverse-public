import assert from 'node:assert/strict';
import test from 'node:test';
import { optionalSongPresentation } from './optional-song-presentation';
import { loadPublicSongPayload } from './load-public-song-payload';

test('optional failure preserves independent exact-identity presentation', async () => {
  const warnings: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args) => { warnings.push(args); };
  try {
    const [canonical, optional] = await Promise.all([
      loadPublicSongPayload('RVTR918814'),
      optionalSongPresentation('RVTR918814', 'fixture-failed-source', async () => { throw new Error('private /local/path'); }, null),
    ]);
    assert.equal(optional, null);
    assert.equal(canonical.rvtr, 'RVTR918814');
    assert.equal(canonical.year, 1975);
    assert.match(canonical.heroUrl ?? '', /rvtr=RVTR918814&file=hero-video.jpg/);
    assert.equal(canonical.resolution, 'graph');
    assert.equal(JSON.stringify(warnings).includes('/local/path'), false);
    assert.equal(warnings.length, 1);
  } finally { console.warn = original; }
});

test('successful optional source preserves its result without changing identity', async () => {
  const value = { rvtr: 'RVTR918814', year: 1975 };
  assert.equal(await optionalSongPresentation('RVTR918814', 'fixture', async () => value, null), value);
});

test('unmatched VirtualDJ identity does not acquire prior canonical year or hero', async () => {
  await loadPublicSongPayload('RVTR918814');
  const unknown = await loadPublicSongPayload('VDJ:0000000000000000', { title: 'Unmatched fixture', artist: 'Fixture artist' });
  assert.equal(unknown.rvtr, 'VDJ:0000000000000000');
  assert.equal(unknown.track, null);
  assert.equal(unknown.year, null);
  assert.equal(unknown.heroUrl, null);
  assert.equal(unknown.resolution, 'partial');
});

test('invalid identity cannot inherit canonical presentation', async () => {
  const unknown = await loadPublicSongPayload('not-an-rvtr');
  assert.equal(unknown.track, null);
  assert.equal(unknown.year, null);
  assert.equal(unknown.heroUrl, null);
  assert.equal(unknown.resolution, 'empty');
});
