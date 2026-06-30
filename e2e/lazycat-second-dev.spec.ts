import { expect, test } from '@playwright/test';

/**
 * LazyCat second-dev E2E — M1+ (skipped until web image sets LAZYCAT flags).
 * @see docs/lazycat-second-dev/TEST_CASES.md TC-E2E-LPK-02
 */
test.describe('LazyCat 二次开发 E2E', () => {
  test.skip(
    process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED !== 'true',
    '需要 LAZYCAT 模式构建的 web 镜像',
  );

  test('微服模式无访问码对话框', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Enter Live Booth|进入直播间/i })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByLabel(/access code|访问码/i)).toHaveCount(0);
  });
});
