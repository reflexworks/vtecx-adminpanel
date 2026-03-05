/**
 * パスワード再発行画面テスト
 * 未ログイン状態でアクセスする画面のため、login() 共通関数は使用しません。
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'

const FORGOT_URL = `${ENV.BASE_URL}/forgot_password.html`

// reCAPTCHA モック
async function mockReCaptcha(page: any) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'grecaptcha', {
      value: {
        enterprise: {
          ready: (cb: () => void) => cb(),
          execute: () => Promise.resolve('dummy-token')
        },
        ready: (cb: () => void) => cb(),
        execute: () => Promise.resolve('dummy-token')
      },
      writable: true
    })
  })
}

async function mockSendMailSuccess(page: any) {
  await page.route('**/d/?_passreset**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'ok' } })
    })
  )
}
async function mockSendMailFailure(page: any) {
  await page.route('**/d/?_passreset**', (route: any) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'Internal Server Error' } })
    })
  )
}

// ── E2E テスト ──────────────────────────────────────────────
test.describe('パスワード再発行画面 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockReCaptcha(page)
    await page.goto(FORGOT_URL)
  })

  // No.1
  test('メール送信成功でステッパーが進む', async ({ page }) => {
    await mockSendMailSuccess(page)
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.click('[data-testid="send-mail-button"]')
    await expect(page.locator('[data-testid="send-complete-message"]')).toBeVisible()
  })

  // No.2
  test('不正メールアドレスで送信ボタンが非活性', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'abc')
    await expect(page.locator('[data-testid="send-mail-button"]')).toBeDisabled()
  })

  // No.3
  test('空欄時に送信ボタンが非活性', async ({ page }) => {
    await expect(page.locator('[data-testid="send-mail-button"]')).toBeDisabled()
  })

  // No.4
  test('送信失敗でエラーメッセージ表示', async ({ page }) => {
    await mockSendMailFailure(page)
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.click('[data-testid="send-mail-button"]')
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'メールの送信に失敗しました。画面をリロードしてもう一度実行してください。'
    )
  })

  // No.5
  test('ログインに戻るリンクで遷移', async ({ page }) => {
    await page.click('[data-testid="back-to-login-link"]')
    await expect(page).toHaveURL(/login\.html/)
  })
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('パスワード再発行画面 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockReCaptcha(page)
    await page.goto(FORGOT_URL)
  })

  // No.6
  test('メール形式チェック：@なし → 送信ボタン非活性', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'userexample.com')
    await expect(page.locator('[data-testid="send-mail-button"]')).toBeDisabled()
  })

  // No.7
  test('メール形式チェック：空文字 → 送信ボタン非活性', async ({ page }) => {
    await expect(page.locator('[data-testid="send-mail-button"]')).toBeDisabled()
  })

  // No.8
  test('メール形式チェック：サブドメインあり → 送信ボタン活性', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'user@mail.example.co.jp')
    await expect(page.locator('[data-testid="send-mail-button"]')).toBeEnabled()
  })

  // No.9
  test('メール送信失敗メッセージの文言が正確', async ({ page }) => {
    await mockSendMailFailure(page)
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.click('[data-testid="send-mail-button"]')
    await expect(page.locator('[data-testid="error-message"]')).toHaveText(
      'メールの送信に失敗しました。画面をリロードしてもう一度実行してください。'
    )
  })
})
