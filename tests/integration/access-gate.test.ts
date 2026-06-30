import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  isAccessGateEnabled,
  isValidAccessPassword,
} from '../../lib/accessPassword';
import { requiresAccessPassword } from '../../lib/lazycat/netdisk-path';
import { restoreEnv, snapshotEnv } from './helpers/mock-env';

describe('isAccessGateEnabled (TC-AUTH-05)', () => {
  const env = snapshotEnv();

  afterEach(() => {
    restoreEnv(env);
  });

  it('disabled when LAZYCAT_DEPLOYED=true', () => {
    process.env.LAZYCAT_DEPLOYED = 'true';
    process.env.ACCESS_PASSWORD = 'dev123';
    assert.equal(isAccessGateEnabled(), false);
  });

  it('disabled when NEXT_PUBLIC_LAZYCAT_DEPLOYED=true', () => {
    process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED = 'true';
    process.env.ACCESS_PASSWORD = 'dev123';
    assert.equal(isAccessGateEnabled(), false);
  });

  it('disabled when NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD=false', () => {
    delete process.env.LAZYCAT_DEPLOYED;
    delete process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED;
    process.env.NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD = 'false';
    process.env.ACCESS_PASSWORD = 'dev123';
    assert.equal(isAccessGateEnabled(), false);
  });

  it('enabled when ACCESS_PASSWORD configured (local docker)', () => {
    delete process.env.LAZYCAT_DEPLOYED;
    delete process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED;
    delete process.env.NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD;
    process.env.ACCESS_PASSWORD = 'dev123';
    assert.equal(isAccessGateEnabled(), true);
  });

  it('disabled when ACCESS_PASSWORD is not configured', () => {
    delete process.env.LAZYCAT_DEPLOYED;
    delete process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED;
    delete process.env.NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD;
    delete process.env.ACCESS_PASSWORD;
    assert.equal(isAccessGateEnabled(), false);
  });

  it('accepts any password when gate is bypassed', () => {
    process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED = 'true';
    assert.equal(isValidAccessPassword('anything'), true);
  });
});

describe('requiresAccessPassword client gate (TC-AUTH-01)', () => {
  const env = snapshotEnv();

  afterEach(() => {
    restoreEnv(env);
  });

  it('returns false when LAZYCAT deployed', () => {
    process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED = 'true';
    assert.equal(requiresAccessPassword(), false);
  });

  it('aligns server bypass with client flag', () => {
    process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED = 'true';
    assert.equal(requiresAccessPassword(), false);
    assert.equal(isAccessGateEnabled(), false);
  });

  it('returns false when REQUIRE_ACCESS_PASSWORD=false', () => {
    delete process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED;
    process.env.NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD = 'false';
    assert.equal(requiresAccessPassword(), false);
  });
});
