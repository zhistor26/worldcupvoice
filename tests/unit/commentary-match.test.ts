import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { COMMENTARY_MATCHES } from '@/lib/commentary';

describe('COMMENTARY_MATCHES default (worldcup-demo-2026)', () => {
  it('uses generic demo metadata instead of Argentina vs France', () => {
    const match = COMMENTARY_MATCHES[0];
    assert.equal(match.id, 'worldcup-demo-2026');
    assert.match(match.title, /WorldCupVoice|演示/i);
    assert.equal(match.homeTeam, 'Demo Red');
    assert.equal(match.awayTeam, 'Demo Blue');
    assert.doesNotMatch(match.title, /Argentina/i);
  });
});
