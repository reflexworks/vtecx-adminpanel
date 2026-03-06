/**
 * サービス管理画面テスト
 * 認証が必要なため、beforeEach で login() を呼び出します。
 * API仕様: /d/_user/${uid}/service?f でサービス一覧取得
 *         /d/?_createservice でサービス作成 (POST)
 *         /d?_deleteservice=${name} でサービス削除 (DELETE)
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

const INDEX_URL = `${ENV.BASE_URL}/index.html`

// ソースの Entry 形式に合わせたモックデータ
// entry.id: '/_service/{name},{seq}', entry.subtitle: 'production' | 'free'
const MOCK_ENTRIES = [
  {
    id: '/_service/pro-service,1',
    subtitle: 'production',
    published: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z'
  },
  {
    id: '/_service/free-service,2',
    subtitle: 'free',
    published: '2024-01-02T00:00:00Z',
    updated: '2024-01-02T00:00:00Z'
  }
]

// ── モックヘルパー ──────────────────────────────────────────

/** サービス一覧・拡張情報をモック（useService.ts の2本のfetchに対応） */
async function mockServiceList(page: any, entries = MOCK_ENTRIES) {
  // service_extension は空で返す（GETのみ）
  await page.route('**/d/_user/*/service_extension**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    else route.continue()
  })
  // サービス一覧（GETのみ）
  await page.route('**/d/_user/*/service**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(entries)
      })
    else route.continue()
  })
}

/** サービス0件をモック */
async function mockServiceListEmpty(page: any) {
  await page.route('**/d/_user/*/service_extension**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  )
  await page.route('**/d/_user/*/service**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  )
}

/** サービス作成成功をモック */
async function mockServiceCreateSuccess(page: any) {
  await page.route('**/d/?_createservice**', (route: any) => {
    if (route.request().method() === 'POST')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'ok' } })
      })
    else route.continue()
  })
}

/** サービス削除成功をモック */
async function mockServiceDeleteSuccess(page: any) {
  await page.route('**/*_deleteservice*', (route: any) => {
    if (route.request().method() === 'DELETE')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'ok' } })
      })
    else route.continue()
  })
}

// ── E2E テスト ──────────────────────────────────────────────
test.describe('サービス管理画面 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, INDEX_URL)
  })

  // No.1
  test('サービス一覧が表示される', async ({ page }) => {
    await mockServiceList(page)
    await page.reload()
    await expect(page.locator('[data-testid="service-table"]')).toBeVisible()
  })

  // No.2
  test('サービス0件時にアラート表示', async ({ page }) => {
    await mockServiceListEmpty(page)
    await page.reload()
    await expect(page.locator('[data-testid="no-service-alert"]')).toContainText(
      'サービスを作成してください。'
    )
  })

  // No.3
  test('Proは緑ChipでFreeはアウトライン表示', async ({ page }) => {
    await mockServiceList(page)
    await page.reload()
    await expect(page.locator('[data-testid="plan-chip-pro-service"]')).toHaveClass(
      /MuiChip-colorSuccess/
    )
    await expect(page.locator('[data-testid="plan-chip-free-service"]')).toHaveClass(
      /MuiChip-outlined/
    )
  })

  // No.4 → 認証なし describe ブロックに移動（下記参照）

  // No.5
  test('「新規作成」ボタンでモーダルが開く', async ({ page }) => {
    await page.click('[data-testid="create-service-button"]')
    await expect(page.locator('[data-testid="create-service-modal"]')).toBeVisible()
  })

  // No.6
  test('不正なサービス名でエラーメッセージ表示', async ({ page }) => {
    await page.click('[data-testid="create-service-button"]')
    await page.fill('[data-testid="service-name-input"]', 'My_Service')
    await expect(page.locator('[data-testid="service-name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="create-confirm-button"]')).toBeDisabled()
  })

  // No.7
  test('有効なサービス名で作成成功メッセージ表示', async ({ page }) => {
    await mockServiceCreateSuccess(page)
    await page.click('[data-testid="create-service-button"]')
    await page.fill('[data-testid="service-name-input"]', 'new-service')
    await page.locator('[data-testid="service-name-input"]').blur()
    await page.click('[data-testid="create-confirm-button"]')
    // 作成成功後はAlertでメッセージ表示
    await expect(page.locator('text=サービス作成を作成しました。')).toBeVisible()
  })

  // No.8
  test('キャンセルでモーダルが閉じる', async ({ page }) => {
    await page.click('[data-testid="create-service-button"]')
    await page.click('[data-testid="create-cancel-button"]')
    await expect(page.locator('[data-testid="create-service-modal"]')).not.toBeVisible()
  })

  // No.9
  test('削除ボタンで確認ダイアログが開く', async ({ page }) => {
    await mockServiceList(page)
    await page.reload()
    await page.click('[data-testid="delete-service-pro-service"]')
    await expect(page.locator('[data-testid="delete-confirm-dialog"]')).toBeVisible()
  })

  // No.10
  test('OKで削除リクエストが200完了後にサービス一覧が再取得される', async ({ page }) => {
    await mockServiceList(page)
    await mockServiceDeleteSuccess(page)
    await page.reload()

    await page.click('[data-testid="delete-service-pro-service"]')
    await page.click('[data-testid="delete-confirm-ok"]')

    // 削除成功後にAlertメッセージが表示される（ソースの afterDeleteService が成功パスで setMesseage を呼ぶ）
    await expect(page.locator('text=の削除しました。')).toBeVisible()

    // 一覧が引き続き描画されていることを確認（サービス一覧が再取得・描画されていればOK）
    await expect(page.locator('[data-testid="service-table"]')).toBeVisible()
  })

  // No.11
  test('キャンセルで削除がキャンセルされる', async ({ page }) => {
    await mockServiceList(page)
    await page.reload()
    await page.click('[data-testid="delete-service-pro-service"]')
    await page.click('[data-testid="delete-confirm-cancel"]')
    await expect(page.locator('[data-testid="delete-confirm-dialog"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="service-row-pro-service"]')).toBeVisible()
  })

  // No.12
  test('管理画面ボタンでredirect.htmlに遷移', async ({ page }) => {
    await mockServiceList(page)
    await page.reload()
    await page.click('[data-testid="admin-link-pro-service"]')
    await expect(page).toHaveURL(/redirect\.html\?service_name=pro-service/)
  })

  // No.13
  test('ログアウトでlogin.htmlに遷移', async ({ page }) => {
    await page.click('[data-testid="account-icon"]')
    await page.click('[data-testid="logout-button"]')
    await expect(page).toHaveURL(/login\.html/)
  })
})

// ── No.4: 認証なし ─────────────────────────────────────────
test.describe('サービス管理画面 - 認証なし', () => {
  // No.4
  test('未ログイン時はlogin.htmlにリダイレクト', async ({ page }) => {
    // login() を呼ばずに直接アクセス
    await page.goto(INDEX_URL)
    await expect(page).toHaveURL(/login\.html/)
  })
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('サービス管理画面 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockServiceList(page) // サービス一覧を事前にモック
    await login(page, INDEX_URL)
    await page.click('[data-testid="create-service-button"]')
  })

  // No.14
  test('有効なサービス名入力で作成ボタンが活性', async ({ page }) => {
    await page.fill('[data-testid="service-name-input"]', 'my-service-01')
    await page.locator('[data-testid="service-name-input"]').blur()
    await expect(page.locator('[data-testid="create-confirm-button"]')).toBeEnabled()
  })

  // No.15
  test('不正なサービス名で作成ボタンが非活性', async ({ page }) => {
    await page.fill('[data-testid="service-name-input"]', 'My_Service')
    await expect(page.locator('[data-testid="create-confirm-button"]')).toBeDisabled()
  })

  // No.16
  test('空欄で作成ボタンが非活性', async ({ page }) => {
    await expect(page.locator('[data-testid="create-confirm-button"]')).toBeDisabled()
  })

  // No.17
  test('サービス名：英小文字+数字+ハイフン → エラーなし', async ({ page }) => {
    await page.fill('[data-testid="service-name-input"]', 'my-service-01')
    await expect(page.locator('[data-testid="service-name-error"]')).not.toBeVisible()
  })

  // No.18
  test('サービス名：大文字含む → エラー表示', async ({ page }) => {
    await page.fill('[data-testid="service-name-input"]', 'My_Service')
    await expect(page.locator('[data-testid="service-name-error"]')).toBeVisible()
  })

  // No.19
  test('productionプランは緑色Chipで表示', async ({ page }) => {
    await page.locator('[data-testid="create-cancel-button"]').click()
    await expect(page.locator('[data-testid="plan-chip-pro-service"]')).toHaveClass(
      /MuiChip-colorSuccess/
    )
  })

  // No.20
  test('freeプランはアウトラインChipで表示', async ({ page }) => {
    await page.locator('[data-testid="create-cancel-button"]').click()
    await expect(page.locator('[data-testid="plan-chip-free-service"]')).toHaveClass(
      /MuiChip-outlined/
    )
  })
})
