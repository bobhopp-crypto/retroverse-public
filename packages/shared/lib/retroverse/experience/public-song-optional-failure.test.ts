import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

mock.module('../../universal-renderer/load-package.ts', {
  namedExports: { loadUniversalPackage: async () => { throw new Error('fixture optional package failure'); } },
});
test('actual canonical loader survives optional package failure with exact year and hero', async () => {
  const { loadPublicSongPayload } = await import('./load-public-song-payload');
  const warnings: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args) => { warnings.push(args); };
  try {
    const result = await loadPublicSongPayload('RVTR918814');
    assert.equal(result.rvtr, 'RVTR918814');
    assert.equal(result.year, 1975);
    assert.match(result.heroUrl ?? '', /rvtr=RVTR918814&file=hero-video.jpg/);
    assert.equal(result.resolution, 'graph');
    assert.ok(warnings.some(row => JSON.stringify(row).includes('universal-package')));
  } finally { console.warn = original; }
});
