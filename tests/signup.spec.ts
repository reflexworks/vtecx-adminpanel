/**
 * 新規登録画面テスト
 * 未ログイン状態でアクセスする画面のため、login() 共通関数は使用しません。
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'

const SIGNUP_URL = `${ENV.BASE_URL}/signup.html`

// ── モックヘルパー ──────────────────────────────────────────
async function mockSignupSuccess(page: any) {
  await page.route('**/d/?_adduser**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'ok' } })
    })
  )
}
async function mockSignupDuplicate(page: any) {
  await page.route('**/d/?_adduser**', (route: any) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'Duplicated key. account = newuser@example.com' } })
    })
  )
}
async function mockSignupMailRequired(page: any) {
  await page.route('**/d/?_adduser**', (route: any) =>
    route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'Mail setting is required' } })
    })
  )
}

async function fillValidForm(page: any) {
  await page.fill('[data-testid="email"]', 'newuser@example.com')
  await page.fill('[data-testid="password"]', 'Passw0rd!')
  await page.fill('[data-testid="password-confirm"]', 'Passw0rd!')
  await page.check('[data-testid="terms-checkbox"]')
}

// reCAPTCHA モック：executeRecaptcha が必ずダミートークンを返すよう差し替える
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

// ── E2E テスト ──────────────────────────────────────────────
test.describe('新規登録画面 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockReCaptcha(page)
    await page.goto(SIGNUP_URL)
  })

  // No.1
  test('仮登録成功でステッパーが進む', async ({ page }) => {
    await mockSignupSuccess(page)
    await fillValidForm(page)
    await page.click('[data-testid="signup-button"]')
    await expect(page.locator('[data-testid="signup-complete-message"]')).toBeVisible()
  })

  // No.2
  test('不正なメールアドレスでエラー表示', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'abc')
    await page.locator('[data-testid="email"]').blur()
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
  })

  // No.3
  test('パスワードがルール不満でエラー表示', async ({ page }) => {
    await page.fill('[data-testid="password"]', 'password')
    await page.locator('[data-testid="password"]').blur()
    await expect(page.locator('[data-testid="password-hint"]')).toHaveCSS(
      'color',
      'rgb(211, 47, 47)'
    )
  })

  // No.4
  test('確認パスワード不一致でエラー表示', async ({ page }) => {
    await page.fill('[data-testid="password"]', 'Passw0rd!')
    await page.fill('[data-testid="password-confirm"]', 'Different1!')
    await page.locator('[data-testid="password-confirm"]').blur()
    await expect(page.locator('[data-testid="password-confirm-error"]')).toBeVisible()
  })

  // No.5
  test('未入力・未チェック時に登録ボタンが非活性', async ({ page }) => {
    await expect(page.locator('[data-testid="signup-button"]')).toBeDisabled()
  })

  // No.6
  test('重複アカウントでエラーメッセージ表示', async ({ page }) => {
    await mockSignupDuplicate(page)
    await fillValidForm(page)
    await page.click('[data-testid="signup-button"]')
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'そのアカウントは既に登録済みです。'
    )
  })

  // No.7
  test('メール設定未実施エラーメッセージ表示', async ({ page }) => {
    await mockSignupMailRequired(page)
    await fillValidForm(page)
    await page.click('[data-testid="signup-button"]')
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'アカウント登録を実行するには事前にメール設定をする必要があります。'
    )
  })

  // No.8
  test('ログインに戻るリンクで遷移', async ({ page }) => {
    await page.click('[data-testid="back-to-login-link"]')
    await expect(page).toHaveURL(/login\.html/)
  })

  // No.9
  test('利用規約リンクで遷移', async ({ page }) => {
    await page.click('[data-testid="terms-link"]')
    await expect(page).toHaveURL(/user_terms\.html/)
  })
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('新規登録画面 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockReCaptcha(page)
    await page.goto(SIGNUP_URL)
  })

  // No.10
  test('全項目有効で仮登録ボタンが活性になる', async ({ page }) => {
    await fillValidForm(page)
    await expect(page.locator('[data-testid="signup-button"]')).toBeEnabled()
  })

  // No.11
  test('利用規約未チェックで仮登録ボタンが非活性のまま', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'Passw0rd!')
    await page.fill('[data-testid="password-confirm"]', 'Passw0rd!')
    await expect(page.locator('[data-testid="signup-button"]')).toBeDisabled()
  })

  // No.12
  test('パスワード不一致で仮登録ボタンが非活性のまま', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'Passw0rd!')
    await page.fill('[data-testid="password-confirm"]', 'DifferentPass1!')
    await page.check('[data-testid="terms-checkbox"]')
    await expect(page.locator('[data-testid="signup-button"]')).toBeDisabled()
  })

  // No.13
  test('メール形式チェック：@なし → エラー表示', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'userexample.com')
    await page.locator('[data-testid="email"]').blur()
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
  })

  // No.14
  test('メール形式チェック：正常形式 → エラー非表示', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.locator('[data-testid="email"]').blur()
    await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible()
  })

  // No.15
  test('パスワード：記号なし → エラー表示', async ({ page }) => {
    await page.fill('[data-testid="password"]', 'Password1')
    await page.locator('[data-testid="password"]').blur()
    await expect(page.locator('[data-testid="password-hint"]')).toHaveCSS(
      'color',
      'rgb(211, 47, 47)'
    )
  })

  // No.16
  test('パスワード：英大文字+小文字+数字+記号8文字以上 → エラーなし', async ({ page }) => {
    await page.fill('[data-testid="password"]', 'Passw0rd!')
    await page.locator('[data-testid="password"]').blur()
    await expect(page.locator('[data-testid="password-hint"]')).not.toHaveCSS(
      'color',
      'rgb(211, 47, 47)'
    )
  })

  // No.17
  test('パスワード：7文字以下 → エラー表示', async ({ page }) => {
    await page.fill('[data-testid="password"]', 'Pass0!')
    await page.locator('[data-testid="password"]').blur()
    await expect(page.locator('[data-testid="password-hint"]')).toHaveCSS(
      'color',
      'rgb(211, 47, 47)'
    )
  })

  // No.18
  test('パスワード：数字なし → エラー表示', async ({ page }) => {
    await page.fill('[data-testid="password"]', 'Password!')
    await page.locator('[data-testid="password"]').blur()
    await expect(page.locator('[data-testid="password-hint"]')).toHaveCSS(
      'color',
      'rgb(211, 47, 47)'
    )
  })

  // No.19
  test('重複アカウントエラーの文言が正確', async ({ page }) => {
    await mockSignupDuplicate(page)
    await fillValidForm(page)
    await page.click('[data-testid="signup-button"]')
    await expect(page.locator('[data-testid="error-message"]')).toHaveText(
      'そのアカウントは既に登録済みです。'
    )
  })

  // No.20
  test('メール設定未実施エラーの文言が正確', async ({ page }) => {
    await mockSignupMailRequired(page)
    await fillValidForm(page)
    await page.click('[data-testid="signup-button"]')
    await expect(page.locator('[data-testid="error-message"]')).toHaveText(
      'アカウント登録を実行するには事前にメール設定をする必要があります。'
    )
  })
})
