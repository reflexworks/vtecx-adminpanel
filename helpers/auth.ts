import { Page, expect } from '@playwright/test';
import { ENV } from '../config/env';

/**
 * ログイン共通関数
 *
 * ログイン画面を開き、設定済みのアカウントID・パスワードで認証します。
 * ログイン成功後、引数で指定した URL へ遷移します。
 *
 * 認証が必要なすべてのテストは、beforeEach でこの関数を呼び出してください。
 *
 * @param page       Playwright の Page オブジェクト
 * @param afterLoginUrl  ログイン成功後に遷移する URL（省略時は index.html）
 *
 * 使用例:
 *   test.beforeEach(async ({ page }) => {
 *     await login(page, `${ENV.BASE_URL}/admin.html#/basic`);
 *   });
 */
export async function login(page: Page, afterLoginUrl?: string): Promise<void> {
  // ログイン画面へ遷移
  await page.goto(`${ENV.BASE_URL}/login.html`);

  // アカウントIDとパスワードを入力
  await page.fill('[data-testid="account-id"]', ENV.LOGIN_ACCOUNT_ID);
  await page.fill('[data-testid="password"]', ENV.LOGIN_PASSWORD);

  // ログインボタンをクリック
  await page.click('[data-testid="login-button"]');

  // login.html から遷移したことで認証成功を確認
  await expect(page).not.toHaveURL(/login\.html/, { timeout: 10_000 });

  // 認証後に目的のページへ遷移
  if (afterLoginUrl) {
    await page.goto(afterLoginUrl);
  }
}
