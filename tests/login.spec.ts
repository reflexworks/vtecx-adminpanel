/**
 * ログイン画面テスト
 * ログイン画面自体のテストのため、login() 共通関数は使用しません。
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'

const LOGIN_URL = `${ENV.BASE_URL}/login.html`

// ── モックヘルパー ──────────────────────────────────────────
async function mockLoginSuccess(page: any, redirectTo = '/index.html') {
  await page.route('**/d/?_login**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ redirect: redirectTo })
    })
  )
}
async function mockLoginFailure(page: any) {
  await page.route('**/d/?_login**', (route: any) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'Unauthorized' } })
    })
  )
}
async function mockLoginCaptchaRequired(page: any) {
  await page.route('**/d/?_login**', (route: any) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'Captcha required at next login.' } })
    })
  )
}

// ── E2E テスト ──────────────────────────────────────────────
test.describe('ログイン画面 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL)
  })

  // No.1
  test('正常ログイン（indexへ遷移）', async ({ page }) => {
    await mockLoginSuccess(page)
    await page.fill('[data-testid="account-id"]', ENV.LOGIN_ACCOUNT_ID)
    await page.fill('[data-testid="password"]', ENV.LOGIN_PASSWORD)
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL(/index\.html/)
  })

  // No.2
  test('クエリパラメータ付きログイン（redirectへ遷移）', async ({ page }) => {
    await page.goto(`${LOGIN_URL}?service_name=${ENV.SERVICE_NAME}`)
    await page.fill('[data-testid="account-id"]', ENV.LOGIN_ACCOUNT_ID)
    await page.fill('[data-testid="password"]', ENV.LOGIN_PASSWORD)
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL(new RegExp(`redirect\\.html\\?service_name=${ENV.SERVICE_NAME}`))
  })

  // No.3
  test('アカウントIDが空の場合はボタンは押せるがリクエストが飛ばない', async ({ page }) => {
    let requested = false
    await page.route('**/d/?_login**', () => {
      requested = true
    })
    await page.fill('[data-testid="password"]', ENV.LOGIN_PASSWORD)
    await page.click('[data-testid="login-button"]')
    await page.waitForTimeout(300)
    expect(requested).toBe(false)
  })

  // No.4
  test('パスワードが空の場合はボタンは押せるがリクエストが飛ばない', async ({ page }) => {
    let requested = false
    await page.route('**/d/?_login**', () => {
      requested = true
    })
    await page.fill('[data-testid="account-id"]', ENV.LOGIN_ACCOUNT_ID)
    await page.click('[data-testid="login-button"]')
    await page.waitForTimeout(300)
    expect(requested).toBe(false)
  })

  // No.5
  test('誤認証でエラーメッセージ表示', async ({ page }) => {
    await mockLoginFailure(page)
    await page.fill('[data-testid="account-id"]', 'wrong@example.com')
    await page.fill('[data-testid="password"]', 'wrongpass')
    await page.click('[data-testid="login-button"]')
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'ログインに失敗しました。メールアドレスまたはパスワードに誤りがあります。'
    )
  })

  // No.6
  test('Captcha required 時に次回はreCAPTCHA実行', async ({ page }) => {
    await mockLoginCaptchaRequired(page)
    await page.fill('[data-testid="account-id"]', ENV.LOGIN_ACCOUNT_ID)
    await page.fill('[data-testid="password"]', ENV.LOGIN_PASSWORD)
    await page.click('[data-testid="login-button"]')
    // 1回目のログイン失敗後、requiredCaptchaがtrueになるのを待つ
    await page.waitForTimeout(500)
    // 2回目のリクエストにreCAPTCHAトークンが付与されることを確認
    let captchaTokenAttached = false
    await page.route('**/d/?_login**', (route: any) => {
      const url = route.request().url()
      if (url.includes('g-recaptcha-token')) {
        captchaTokenAttached = true
      }
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.fill('[data-testid="password"]', ENV.LOGIN_PASSWORD)
    await page.click('[data-testid="login-button"]')
    await page.waitForTimeout(500)
    expect(captchaTokenAttached).toBe(true)
  })

  // No.7
  test('パスワード再発行リンクで遷移', async ({ page }) => {
    await page.click('[data-testid="forgot-password-link"]')
    await expect(page).toHaveURL(/forgot_password\.html/)
  })

  // No.8
  test('アカウント登録リンクで遷移', async ({ page }) => {
    await page.click('[data-testid="signup-link"]')
    await expect(page).toHaveURL(/signup\.html/)
  })
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('ログイン画面 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL)
  })

  // No.9
  test('両方入力済みでログインボタンを押すとAPIリクエストが発生する', async ({ page }) => {
    let requested = false
    await page.route('**/d/?_login**', (route: any) => {
      requested = true
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })
    await page.fill('[data-testid="account-id"]', ENV.LOGIN_ACCOUNT_ID)
    await page.fill('[data-testid="password"]', ENV.LOGIN_PASSWORD)
    await page.click('[data-testid="login-button"]')
    await page.waitForTimeout(300)
    expect(requested).toBe(true)
  })

  // No.10
  test('アカウントIDのみ入力でボタンを押してもAPIリクエストが発生しない', async ({ page }) => {
    let requested = false
    await page.route('**/d/?_login**', () => {
      requested = true
    })
    await page.fill('[data-testid="account-id"]', ENV.LOGIN_ACCOUNT_ID)
    await page.click('[data-testid="login-button"]')
    await page.waitForTimeout(300)
    expect(requested).toBe(false)
  })

  // No.11
  test('パスワードのみ入力でボタンを押してもAPIリクエストが発生しない', async ({ page }) => {
    let requested = false
    await page.route('**/d/?_login**', () => {
      requested = true
    })
    await page.fill('[data-testid="password"]', ENV.LOGIN_PASSWORD)
    await page.click('[data-testid="login-button"]')
    await page.waitForTimeout(300)
    expect(requested).toBe(false)
  })

  // No.12
  test('認証失敗メッセージの文言が正確', async ({ page }) => {
    await mockLoginFailure(page)
    await page.fill('[data-testid="account-id"]', 'wrong@example.com')
    await page.fill('[data-testid="password"]', 'wrongpass')
    await page.click('[data-testid="login-button"]')
    await expect(page.locator('[data-testid="error-message"]')).toHaveText(
      'ログインに失敗しました。メールアドレスまたはパスワードに誤りがあります。'
    )
  })
})
