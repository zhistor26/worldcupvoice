import { expect, test } from '@playwright/test';

/**
 * LazyCat second-dev E2E — M1+
 *
 * Dual-mode CI (see docs/lazycat-second-dev/PYRAMID_TESTING.md §4.4):
 * - Default job: skipped — web built with NEXT_PUBLIC_LAZYCAT_DEPLOYED=false.
 * - LAZYCAT job: build web with LAZYCAT build_args, then run Playwright with
 *   NEXT_PUBLIC_LAZYCAT_DEPLOYED=true or PLAYWRIGHT_LAZYCAT_MODE=1.
 *
 * @see docs/lazycat-second-dev/TEST_CASES-v0.2.md TC-E2E-LPK-02
 */
function isLazycatE2eEnabled(): boolean {
  return (
    process.env.PLAYWRIGHT_LAZYCAT_MODE === '1' ||
    process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED === 'true'
  );
}

const lazycatSkipReason =
  '需要 LAZYCAT 模式：构建 web 时设 NEXT_PUBLIC_LAZYCAT_DEPLOYED=true，或运行 Playwright 时设 PLAYWRIGHT_LAZYCAT_MODE=1';

test.describe('LazyCat 二次开发 E2E', () => {
  test('generate-agora-token 免密模式下无需 cookie (TC-E2E-LPK-02 API)', async ({
    request,
  }) => {
    test.skip(!isLazycatE2eEnabled(), lazycatSkipReason);

    const response = await request.get('/api/generate-agora-token');
    expect(response.status()).not.toBe(401);
    if (response.status() === 200) {
      const body = (await response.json()) as { token?: string };
      expect(body.token).toBeTruthy();
    }
  });

  test('微服模式无访问码对话框', async ({ page }) => {
    test.skip(!isLazycatE2eEnabled(), lazycatSkipReason);

    await page.goto('/');
    await expect(page.getByRole('button', { name: /Enter Live Booth|进入直播间/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel(/access code|访问码/i)).toHaveCount(0);
  });
});
