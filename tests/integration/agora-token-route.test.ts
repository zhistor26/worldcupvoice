import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { NextRequest } from 'next/server';

import {
  ACCESS_COOKIE_NAME,
  createAccessCookieValue,
} from '../../lib/accessPassword';
import { restoreEnv, snapshotEnv } from './helpers/mock-env';

const MOCK_AGORA_APP_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const MOCK_AGORA_CERT = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

describe('GET /api/generate-agora-token (AC-P0-02)', () => {
  const env = snapshotEnv();

  afterEach(() => {
    restoreEnv(env);
  });

  it('returns 401 when gate enabled without access cookie', async () => {
    delete process.env.LAZYCAT_DEPLOYED;
    delete process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED;
    delete process.env.NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD;
    process.env.ACCESS_PASSWORD = 'dev123';

    const { GET } = await import('../../app/api/generate-agora-token/route');
    const request = new NextRequest('http://localhost/api/generate-agora-token');
    const response = await GET(request);

    assert.equal(response.status, 401);
    const body = (await response.json()) as { error?: string };
    assert.match(body.error ?? '', /Access verification is required/);
  });

  it('bypasses gate when LAZYCAT deployed (no cookie)', async () => {
    process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED = 'true';
    delete process.env.ACCESS_PASSWORD;
    delete process.env.NEXT_PUBLIC_AGORA_APP_ID;
    delete process.env.NEXT_AGORA_APP_CERTIFICATE;

    const { GET } = await import('../../app/api/generate-agora-token/route');
    const request = new NextRequest('http://localhost/api/generate-agora-token');
    const response = await GET(request);

    assert.notEqual(response.status, 401);
    assert.equal(response.status, 500);
    const body = (await response.json()) as { error?: string };
    assert.match(body.error ?? '', /Agora credentials are not set/);
  });

  it('returns 500 when Agora credentials are missing', async () => {
    process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED = 'true';
    delete process.env.NEXT_PUBLIC_AGORA_APP_ID;
    delete process.env.NEXT_AGORA_APP_CERTIFICATE;

    const { GET } = await import('../../app/api/generate-agora-token/route');
    const request = new NextRequest('http://localhost/api/generate-agora-token');
    const response = await GET(request);

    assert.equal(response.status, 500);
  });

  it('returns 200 with valid cookie and mock Agora credentials', async () => {
    delete process.env.LAZYCAT_DEPLOYED;
    delete process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED;
    delete process.env.NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD;
    process.env.ACCESS_PASSWORD = 'dev123';
    process.env.NEXT_PUBLIC_AGORA_APP_ID = MOCK_AGORA_APP_ID;
    process.env.NEXT_AGORA_APP_CERTIFICATE = MOCK_AGORA_CERT;

    const cookieValue = createAccessCookieValue();
    const { GET } = await import('../../app/api/generate-agora-token/route');
    const request = new NextRequest('http://localhost/api/generate-agora-token', {
      headers: {
        cookie: `${ACCESS_COOKIE_NAME}=${cookieValue}`,
      },
    });
    const response = await GET(request);

    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      token?: string;
      uid?: string;
      channel?: string;
    };
    assert.ok(body.token);
    assert.ok(body.uid);
    assert.equal(body.channel, 'worldcup-live');
  });
});
