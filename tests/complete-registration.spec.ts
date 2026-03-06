/**
 * 本登録完了画面テスト
 * 認証が必要な画面のため、login() 共通関数で事前ログインします。
 * 認証チェックはフレームワークが行うため、ソース側のモックは不要です。
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

const COMPLETE_URL = `${ENV.BASE_URL}/complete_registration.html`

test.describe('本登録完了画面', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto(COMPLETE_URL)
  })

  // No.1
  test('完了メッセージが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="complete-message"]')).toContainText(
      '本登録が完了しました。'
    )
  })

  // No.2
  test('ログインに戻るリンクで遷移', async ({ page }) => {
    await page.click('[data-testid="back-to-login-link"]')
    await expect(page).toHaveURL(/login\.html/)
  })

  // No.3（単体）
  test('【単体】完了メッセージの文言が正確', async ({ page }) => {
    await expect(page.locator('[data-testid="complete-message"]')).toHaveText(
      '本登録が完了しました。'
    )
  })

  // No.4
  test('未ログイン状態でアクセスするとログイン画面へリダイレクト', async ({ page }) => {
    // ログアウト状態を作るため、新規コンテキストは使わず
    // 未ログインのまま直接アクセスしてフレームワークのリダイレクトを確認
    await page.context().clearCookies()
    await page.goto(COMPLETE_URL)
    await expect(page).toHaveURL(/login\.html/)
  })
})
