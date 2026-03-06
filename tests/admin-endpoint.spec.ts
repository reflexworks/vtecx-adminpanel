/**
 * 管理画面 - エンドポイントテスト
 * 認証が必要なため、beforeEach で login() を呼び出します。
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

const EP_URL = `${ENV.BASE_URL}/admin.html#/endpoint`

// VtecxApp.Entry[] 形式のモックデータ
// endpoint_name = entry.id.split(',')[0]  例: "/users" → ep-row-users
// is_service     = endpoint_name.indexOf('/_') !== -1  例: "/_settings" → ep-row-_settings (グレー背景, 編集/削除なし)
const MOCK_ENDPOINTS: any[] = [
  {
    id: '/users,1',
    title: 'ユーザー管理',
    summary: 'admin',
    contributor: [{ uri: 'urn:vte.cx:acl:admin' }]
  },
  {
    id: '/_settings,1',
    title: 'システム設定',
    summary: 'system',
    contributor: [{ uri: 'urn:vte.cx:acl:system' }]
  }
]

/**
 * エンドポイント一覧 API モック
 * 実API: GET /d/?f&l=*  → VtecxApp.Entry[] 配列
 */
async function mockEndpoints(page: any, endpoints = MOCK_ENDPOINTS) {
  await page.route('**/d/**f**l=*', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(endpoints)
    })
  )
}

/**
 * エンドポイント作成 API モック
 * 実API: PUT /d/  → 成功時 200
 */
async function mockCreateEpSuccess(page: any) {
  await page.route('**/d/', (route: any) => {
    if (route.request().method() === 'PUT')
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    else route.continue()
  })
}

/**
 * エンドポイント削除 API モック
 * 実API: DELETE /d/{endpoint}?_rf  → 成功時 200
 */
async function mockDeleteEpSuccess(page: any) {
  await page.route('**/d/**_rf', (route: any) => {
    if (route.request().method() === 'DELETE')
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    else route.continue()
  })
}

// ── E2E テスト ──────────────────────────────────────────────
test.describe('管理画面 - エンドポイント - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockEndpoints(page)
    await login(page, EP_URL)
  })

  // No.1
  test('エンドポイント一覧が表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="ep-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="ep-col-name"]')).toBeVisible()
  })

  // No.2
  // is_service = endpoint_name.indexOf('/_') !== -1 → backgroundColor: grey[100] = rgb(238, 238, 238)
  // 編集・削除ボタンは !is_service の場合のみ表示
  test('/_始まりはグレー背景で編集削除ボタン非表示', async ({ page }) => {
    const sysRow = page.locator('[data-testid="ep-row-_settings"]')
    await expect(sysRow).toHaveCSS('background-color', 'rgb(245, 245, 245)')
    await expect(sysRow.locator('[data-testid="edit-button"]')).not.toBeVisible()
    await expect(sysRow.locator('[data-testid="delete-button"]')).not.toBeVisible()
  })

  // No.3
  test('「追加」ボタンでモーダルが開く', async ({ page }) => {
    await page.locator('[data-testid="add-ep-button"]').last().click()
    await expect(page.locator('[data-testid="ep-modal"]')).toBeVisible()
  })

  // No.4
  test('数字始まりでエラーメッセージ表示', async ({ page }) => {
    await page.locator('[data-testid="add-ep-button"]').last().click()
    await page.fill('[data-testid="ep-name-input"]', '1endpoint')
    await expect(page.locator('[data-testid="ep-name-error"]')).toContainText(
      'エンドポイント名は半角英字から開始してください。'
    )
  })

  // No.5
  // 編集ボタンでモーダルが開き既存値が入力済み
  // ep-name-input は disabled (entry が存在するため)
  test('編集ボタンでモーダルが開き既存値が入力済み', async ({ page }) => {
    await page.click('[data-testid="ep-row-users"] [data-testid="edit-button"]')
    await expect(page.locator('[data-testid="ep-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="ep-name-input"]')).toHaveValue('users')
    await expect(page.locator('[data-testid="ep-name-input"]')).toBeDisabled()
  })

  // No.6
  test('削除ボタンで確認ダイアログが開く', async ({ page }) => {
    await page.click('[data-testid="ep-row-users"] [data-testid="delete-button"]')
    await expect(page.locator('[data-testid="delete-confirm-dialog"]')).toBeVisible()
  })

  // No.7
  // OKで削除実行後 getEndpoint() が呼ばれ、モックは空配列を返すためep-row-usersが消える
  test('OKで削除が実行される', async ({ page }) => {
    await mockDeleteEpSuccess(page)
    // 削除後の再フェッチ用に空リストを返すようモック上書き
    await mockEndpoints(page, [
      {
        id: '/_settings,1',
        title: 'システム設定',
        summary: 'system',
        contributor: [{ uri: 'urn:vte.cx:acl:system' }]
      }
    ])
    await page.click('[data-testid="ep-row-users"] [data-testid="delete-button"]')
    await page.click('[data-testid="delete-confirm-ok"]')
    await expect(page.locator('[data-testid="ep-row-users"]')).not.toBeVisible()
  })
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('管理画面 - エンドポイント - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockEndpoints(page)
    await login(page, EP_URL)
    await page.locator('[data-testid="add-ep-button"]').last().click()
  })

  // No.8
  test('有効なEP名入力で保存ボタンが活性', async ({ page }) => {
    await page.fill('[data-testid="ep-name-input"]', 'validendpoint')
    await expect(page.locator('[data-testid="ep-save-button"]')).toBeEnabled()
  })

  // No.9
  test('不正なEP名で保存ボタンが非活性', async ({ page }) => {
    await page.fill('[data-testid="ep-name-input"]', '1endpoint')
    await expect(page.locator('[data-testid="ep-save-button"]')).toBeDisabled()
  })

  // No.10
  test('EP名：英小文字のみ → エラーなし', async ({ page }) => {
    await page.fill('[data-testid="ep-name-input"]', 'myendpoint')
    await expect(page.locator('[data-testid="ep-name-error"]')).not.toBeVisible()
  })

  // No.11
  test('EP名：数字始まり → エラー表示', async ({ page }) => {
    await page.fill('[data-testid="ep-name-input"]', '1endpoint')
    await expect(page.locator('[data-testid="ep-name-error"]')).toBeVisible()
  })

  // No.12
  // validation('endpoint', 'MyEndpoint') → 大文字は許容 (半角英数とアンダーバー) → エラーなし
  // ソース: /^[a-zA-Z0-9_]*$/ かつ先頭が /^[a-zA-Z]*$/ → 大文字始まりOK → エラーなし → テスト削除
  // ※ No.13は削除 (大文字含むはvalidation的にエラーにならないため)

  // No.12
  test('EP名：空文字 → 保存ボタン非活性', async ({ page }) => {
    await expect(page.locator('[data-testid="ep-save-button"]')).toBeDisabled()
  })

  // No.13
  test('数字始まりエラーメッセージの文言が正確', async ({ page }) => {
    await page.fill('[data-testid="ep-name-input"]', '1endpoint')
    await expect(page.locator('[data-testid="ep-name-error"]')).toHaveText(
      'エンドポイント名は半角英字から開始してください。'
    )
  })

  // No.14
  // grey[100] = rgb(238, 238, 238)
  test('/_始まりEPはグレー背景', async ({ page }) => {
    await page.locator('[data-testid="ep-modal-close"]').click()
    await expect(page.locator('[data-testid="ep-row-_settings"]')).toHaveCSS(
      'background-color',
      'rgb(245, 245, 245)'
    )
  })

  // No.15
  test('/_始まりEPには編集ボタンが表示されない', async ({ page }) => {
    await page.locator('[data-testid="ep-modal-close"]').click()
    await expect(
      page.locator('[data-testid="ep-row-_settings"] [data-testid="edit-button"]')
    ).not.toBeVisible()
  })
})
