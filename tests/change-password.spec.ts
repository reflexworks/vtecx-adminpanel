/**
 * パスワード変更画面テスト
 * メールリンク経由でアクセスする画面のため、login() 共通関数は使用しません。
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'

const VALID_URL = `${ENV.BASE_URL}/change_password.html#/?_RXID=validrxid&_passreset_token=validtoken`

async function mockTokenValid(page: any) {
  await page.route('**/d/?_uid**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'validuid' } })
    })
  )
}
async function mockTokenInvalid(page: any) {
  await page.route('**/d/?_uid**', (route: any) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'Invalid token' } })
    })
  )
}
async function mockTokenRxidUsed(page: any) {
  await page.route('**/d/?_uid**', (route: any) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'RXID has been used more than once.' } })
    })
  )
}
async function mockChangePasswordSuccess(page: any) {
  await page.route('**/d/?_changephash**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'ok' } })
    })
  )
}

// ── E2E テスト ──────────────────────────────────────────────
test.describe('パスワード変更画面 - E2E', () => {
  // No.1
  test('有効なURLでフォームが表示される', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(VALID_URL)
    await expect(page.locator('[data-testid="change-password-form"]')).toBeVisible()
  })

  // No.2
  test('無効なURLでエラーメッセージ表示', async ({ page }) => {
    await page.goto(`${ENV.BASE_URL}/change_password.html`)
    await expect(page.locator('[data-testid="token-error-message"]')).toContainText(
      'このリンクは無効か、有効期限が切れています。'
    )
  })

  // No.3
  test('ページロード中に検証中メッセージ表示', async ({ page }) => {
    await page.route('**/d/?_uid**', async (route: any) => {
      await new Promise(r => setTimeout(r, 1000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'validuid' } })
      })
    })
    await page.goto(VALID_URL)
    await expect(page.locator('[data-testid="verifying-message"]')).toBeVisible()
  })

  // No.4
  test('RXID使用済みでもトークンがあれば続行', async ({ page }) => {
    await mockTokenRxidUsed(page)
    await page.goto(VALID_URL)
    await expect(page.locator('[data-testid="change-password-form"]')).toBeVisible()
  })

  // No.5
  test('有効なパスワードで変更完了メッセージ表示', async ({ page }) => {
    await mockTokenValid(page)
    await mockChangePasswordSuccess(page)
    await page.goto(VALID_URL)
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      '新しいパスワードへの変更が完了しました。'
    )
  })

  // No.6
  test('ルール不満のパスワードでエラー表示', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(VALID_URL)
    await page.fill('[data-testid="new-password"]', 'pass')
    await page.locator('[data-testid="new-password"]').blur()
    await expect(page.locator('[data-testid="new-password-error"]')).toBeVisible()
  })

  // No.7
  test('確認パスワード不一致でエラー表示', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(VALID_URL)
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'Different1!')
    await page.locator('[data-testid="new-password-confirm"]').blur()
    await expect(page.locator('[data-testid="new-password-confirm-error"]')).toBeVisible()
  })

  // No.8
  test('不正入力時に変更ボタンが非活性', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(VALID_URL)
    await expect(page.locator('[data-testid="change-password-button"]')).toBeDisabled()
  })

  // No.9
  test('ログインに戻るリンクで遷移', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(VALID_URL)
    await page.click('[data-testid="back-to-login-link"]')
    await expect(page).toHaveURL(/login\.html/)
  })
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('パスワード変更画面 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(VALID_URL)
  })

  // No.10
  test('有効パスワードで一致時に変更ボタンが活性', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeEnabled()
  })

  // No.11
  test('確認パスワード不一致で変更ボタンが非活性', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'Different1!')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeDisabled()
  })

  // No.12
  test('ルール不満のパスワードで変更ボタンが非活性', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'pass')
    await page.fill('[data-testid="new-password-confirm"]', 'pass')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeDisabled()
  })

  // No.13
  test('パスワード：記号なし → エラー', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'Password1')
    await page.locator('[data-testid="new-password"]').blur()
    await expect(page.locator('[data-testid="new-password-error"]')).toBeVisible()
  })

  // No.14
  test('パスワード：7文字以下 → エラー', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'Pass0!')
    await page.locator('[data-testid="new-password"]').blur()
    await expect(page.locator('[data-testid="new-password-error"]')).toBeVisible()
  })

  // No.15
  test('パスワード：数字なし → エラー', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'Password!')
    await page.locator('[data-testid="new-password"]').blur()
    await expect(page.locator('[data-testid="new-password-error"]')).toBeVisible()
  })

  // No.16
  test('パスワード：大文字+小文字+数字+記号 → エラーなし', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'Passw0rd!')
    await page.locator('[data-testid="new-password"]').blur()
    await expect(page.locator('[data-testid="new-password-error"]')).not.toBeVisible()
  })

  // No.17
  test('リンク無効メッセージの文言が正確', async ({ page }) => {
    await page.unroute('**/d/?_uid**')
    await mockTokenInvalid(page)
    await page.goto(`${ENV.BASE_URL}/change_password.html`)
    await expect(page.locator('[data-testid="token-error-message"]')).toHaveText(
      'このリンクは無効か、有効期限が切れています。'
    )
  })

  // No.18
  test('変更完了メッセージの文言が正確', async ({ page }) => {
    await mockChangePasswordSuccess(page)
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(page.locator('[data-testid="success-message"]')).toHaveText(
      '新しいパスワードへの変更が完了しました。'
    )
  })
})
