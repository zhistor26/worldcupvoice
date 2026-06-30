import { expect, test, type Page } from '@playwright/test';

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD ?? 'dev123';

function accessCodeInput(page: Page) {
  return page.getByRole('textbox', { name: 'Access code' });
}

async function openAccessGate(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter live booth' }).click();
  await expect(page.getByRole('dialog', { name: 'Enter access code' })).toBeVisible();
}

test.describe('WorldCupVoice 前端冒烟', () => {
  test('首页加载并显示 Enter Live Booth', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('button', { name: 'Enter live booth' }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('AI live', { exact: true })).toBeVisible();
  });

  test('点击 Enter Live Booth 弹出访问码对话框', async ({ page }) => {
    await openAccessGate(page);
    await expect(page.getByRole('heading', { name: 'Enter access code' })).toBeVisible();
    await expect(accessCodeInput(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  test('错误访问码显示错误提示', async ({ page }) => {
    await openAccessGate(page);
    await accessCodeInput(page).fill('wrong-password');
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Incorrect access code. Try again.')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('正确访问码进入直播间（Agora 连接或明确错误）', async ({ page }) => {
    await openAccessGate(page);
    await accessCodeInput(page).fill(ACCESS_PASSWORD);
    await page.getByRole('button', { name: 'Continue' }).click();

    const startAi = page.getByRole('button', { name: 'Start AI' });
    const entering = page.getByRole('button', { name: 'Entering live booth' });
    const agoraError = page.getByText(/Failed to generate Agora token|Failed to start conversation/i);

    await expect(startAi.or(entering).or(agoraError)).toBeVisible({ timeout: 45_000 });

    if (await startAi.isVisible().catch(() => false)) {
      await expect(startAi).toBeEnabled();
    }
  });

  test('访问码对话框可取消', async ({ page }) => {
    await openAccessGate(page);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('dialog', { name: 'Enter access code' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Enter live booth' })).toBeVisible();
  });
});
