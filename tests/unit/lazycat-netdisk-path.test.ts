import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildLazyCatFileUrl,
  isVideoPath,
  normalizeLazyCatPath,
  requiresAccessPassword,
} from '../../lib/lazycat/netdisk-path';

describe('normalizeLazyCatPath', () => {
  it('strips /_lzc/files/home prefix', () => {
    assert.equal(
      normalizeLazyCatPath('/_lzc/files/home/Movies/match.mp4'),
      '/Movies/match.mp4',
    );
  });

  it('adds leading slash', () => {
    assert.equal(normalizeLazyCatPath('Movies/match.mp4'), '/Movies/match.mp4');
  });

  it('trims trailing dot segment', () => {
    assert.equal(normalizeLazyCatPath('/Movies/.'), '/Movies');
  });
});

describe('buildLazyCatFileUrl', () => {
  it('rebuilds fetch URL', () => {
    assert.equal(
      buildLazyCatFileUrl('/Movies/match.mp4'),
      '/_lzc/files/home/Movies/match.mp4',
    );
  });

  it('rejects empty path', () => {
    assert.throws(() => buildLazyCatFileUrl(''), /Invalid LazyCat file path/);
  });
});

describe('isVideoPath', () => {
  it('accepts mp4', () => {
    assert.equal(isVideoPath('/_lzc/files/home/a.mp4'), true);
  });

  it('rejects txt', () => {
    assert.equal(isVideoPath('/notes.txt'), false);
  });
});

describe('requiresAccessPassword', () => {
  const original = { ...process.env };

  it('returns false when LAZYCAT deployed', () => {
    process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED = 'true';
    assert.equal(requiresAccessPassword(), false);
    process.env = { ...original };
  });

  it('returns true by default for local docker', () => {
    delete process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED;
    delete process.env.NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD;
    assert.equal(requiresAccessPassword(), true);
    process.env = { ...original };
  });
});
