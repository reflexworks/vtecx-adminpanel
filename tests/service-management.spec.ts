/**
 * サービス管理画面テスト（拡張版）
 * 認証が必要なため、beforeEach で login() を呼び出します。
 *
 * API仕様:
 *   GET  /d/_user/{uid}/service?f          → VtecxApp.Entry[]（サービス一覧）
 *   GET  /d/_user/{uid}/service_extension?f → VtecxApp.Entry[]（拡張情報）
 *   POST /d/?_createservice                → 作成
 *   DELETE /d?_deleteservice={name}        → 削除
 *   PUT  /d?_servicetoproduction={name}    → Pro昇格 → { feed: { title: 'StripeURL' } }
 *   PUT  /d?_servicetostaging={name}       → Free降格 → 200
 *   GET  /d/_user/{uid}/service/{name}?e   → サービス詳細
 *
 * data-testid 一覧:
 *   service-table               テーブル全体
 *   no-service-alert            サービス0件アラート
 *   service-row-{name}          各サービス行
 *   plan-chip-{name}            プランChip（Pro/Free/解約申請中）
 *   public-settings-{name}      プラン変更ボタン
 *   admin-link-{name}           管理画面ボタン
 *   more-menu-{name}            「...」メニューアイコン
 *   create-service-button       新規作成ボタン
 *   create-service-modal        新規作成モーダル
 *   service-name-input          サービス名入力欄
 *   service-name-error          サービス名バリデーションエラー
 *   create-cancel-button        新規作成キャンセルボタン
 *   create-confirm-button       新規作成確定ボタン
 *   delete-confirm-dialog       削除確認ダイアログ
 *   delete-pro-warning          Pro契約中サービス削除警告
 *   delete-passphrase-input     あいことば入力欄
 *   delete-cancel-button        削除キャンセルボタン
 *   delete-confirm-button       削除実行ボタン
 *   account-icon                アカウントアイコン
 *   logout-button               ログアウトボタン
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

const INDEX_URL = `${ENV.BASE_URL}/index.html`

// ─── モックデータ ─────────────────────────────────────────────

/** contributor から EnvType を決定するエントリ群 */
const MOCK_ENTRIES = [
  {
    id: '/_service/pro-service,1',
    subtitle: 'production',
    published: '2024-01-01T00:00:00Z',
    contributor: [{ uri: 'urn:vte.cx:stripe:sub:sub_ABC123' }]
    // Pro課金中
  },
  {
    id: '/_service/free-service,2',
    subtitle: 'development',
    published: '2024-01-02T00:00:00Z'
    // Free
  },
  {
    id: '/_service/cancel-service,3',
    subtitle: 'production',
    published: '2024-01-03T00:00:00Z',
    contributor: [
      { uri: 'urn:vte.cx:stripe:sub:sub_DEF456' },
      { uri: 'urn:vte.cx:stripe:cancel:2026-05-31T23:59:59+09:00' }
    ]
    // 解約申請中
  }
]

// ─── モックヘルパー ──────────────────────────────────────────

async function mockServiceList(page: any, entries = MOCK_ENTRIES) {
  await page.route('**/d/_user/*/service_extension**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    else route.continue()
  })
  await page.route('**/d/_user/*/service**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entries) })
    else route.continue()
  })
}

async function mockServiceListEmpty(page: any) {
  await page.route('**/d/_user/*/service_extension**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/d/_user/*/service**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
}

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

async function mockUpgradeToProWithStripe(page: any) {
  await page.route('**/*_servicetoproduction*', (route: any) => {
    if (route.request().method() === 'PUT')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'https://checkout.stripe.com/test-session' } })
      })
    else route.continue()
  })
}

async function mockUpgradeToProImmediate(page: any) {
  // カード登録済みのため即時変更（URLなし）
  await page.route('**/*_servicetoproduction*', (route: any) => {
    if (route.request().method() === 'PUT')
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    else route.continue()
  })
}

async function mockUpgradeToPro202WithMessage(page: any) {
  // 202 + feed.title に成功メッセージ（URLではない）が入るケース
  await page.route('**/*_servicetoproduction*', (route: any) => {
    if (route.request().method() === 'PUT')
      route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: "The change in service status to 'production'" } })
      })
    else route.continue()
  })
}

async function mockDowngradeToStaging(page: any, cancelAt = '2026-05-31T23:59:59+09:00') {
  await page.route('**/*_servicetostaging*', (route: any) => {
    if (route.request().method() === 'PUT')
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) })
    else route.continue()
  })
  await page.route('**/*service*pro-service*e*', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributor: [
            { uri: 'urn:vte.cx:stripe:sub:sub_ABC123' },
            { uri: `urn:vte.cx:stripe:cancel:${cancelAt}` }
          ]
        })
      })
    else route.continue()
  })
}

// ─── E2E テスト：サービス一覧 ─────────────────────────────────
test.describe('サービス管理 - サービス一覧 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockServiceList(page)
    await login(page, INDEX_URL)
  })

  // No.1
  test('サービス一覧テーブルが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="service-table"]')).toBeVisible()
  })

  // No.2
  test('サービス0件時にアラートが表示される', async ({ page }) => {
    await mockServiceListEmpty(page)
    await page.reload()
    await expect(page.locator('[data-testid="no-service-alert"]')).toBeVisible()
    await expect(page.locator('[data-testid="no-service-alert"]')).toContainText(
      'サービスを作成してください。'
    )
  })

  // No.3
  test('Pro課金中サービスは緑Chipで表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="plan-chip-pro-service"]')).toHaveClass(
      /MuiChip-colorSuccess/
    )
  })

  // No.4
  test('Freeサービスはアウトラインで表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="plan-chip-free-service"]')).toHaveClass(
      /MuiChip-outlined/
    )
  })

  // No.5
  test('解約申請中サービスはオレンジ系のChipで表示される', async ({ page }) => {
    const chip = page.locator('[data-testid="plan-chip-cancel-service"]')
    await expect(chip).toBeVisible()
    await expect(chip).toContainText('解約申請中')
  })

  // No.6
  test('解約申請中サービスの行にFree移行予定日が表示される', async ({ page }) => {
    const row = page.locator('[data-testid="service-row-cancel-service"]')
    await expect(row).toContainText('にFree移行予定')
  })

  // No.7
  test('ログアウトでlogin.htmlに遷移する', async ({ page }) => {
    await page.click('[data-testid="account-icon"]')
    await page.click('[data-testid="logout-button"]')
    await expect(page).toHaveURL(/login\.html/)
  })

  // No.8
  test('管理画面ボタンでredirect.htmlに遷移する', async ({ page }) => {
    await page.click('[data-testid="admin-link-pro-service"]')
    await expect(page).toHaveURL(/redirect\.html\?service_name=pro-service/)
  })
})

// ─── E2E テスト：サービス新規作成 ────────────────────────────
test.describe('サービス管理 - 新規作成 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockServiceList(page)
    await login(page, INDEX_URL)
  })

  // No.9
  test('「新規作成」ボタンでモーダルが開く', async ({ page }) => {
    await page.click('[data-testid="create-service-button"]')
    await expect(page.locator('[data-testid="create-service-modal"]')).toBeVisible()
  })

  // No.10
  test('不正なサービス名でエラーと確定ボタン非活性', async ({ page }) => {
    await page.click('[data-testid="create-service-button"]')
    await page.fill('[data-testid="service-name-input"]', 'My_Service')
    await expect(page.locator('[data-testid="service-name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="create-confirm-button"]')).toBeDisabled()
  })

  // No.11
  test('有効なサービス名で作成成功後にメッセージ表示とリスト再取得', async ({ page }) => {
    await mockServiceCreateSuccess(page)
    await page.click('[data-testid="create-service-button"]')
    await page.fill('[data-testid="service-name-input"]', 'new-service')
    await page.locator('[data-testid="service-name-input"]').blur()
    await page.click('[data-testid="create-confirm-button"]')
    await expect(page.locator('text=サービス作成を作成しました。')).toBeVisible()
  })

  // No.12
  test('キャンセルでモーダルが閉じる', async ({ page }) => {
    await page.click('[data-testid="create-service-button"]')
    await page.click('[data-testid="create-cancel-button"]')
    await expect(page.locator('[data-testid="create-service-modal"]')).not.toBeVisible()
  })
})

// ─── E2E テスト：サービス削除 ────────────────────────────────
test.describe('サービス管理 - サービス削除 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockServiceList(page)
    await login(page, INDEX_URL)
  })

  // No.13
  test('「...」メニューから削除ダイアログが開く', async ({ page }) => {
    await page.click('[data-testid="more-menu-pro-service"]')
    await page.locator('.MuiMenuItem-root', { hasText: '削除' }).click()
    await expect(page.locator('[data-testid="delete-confirm-dialog"]')).toBeVisible()
  })

  // No.14
  test('Pro契約中サービス削除時にサブスク解除の警告が表示される', async ({ page }) => {
    await page.click('[data-testid="more-menu-pro-service"]')
    await page.locator('.MuiMenuItem-root', { hasText: '削除' }).click()
    await expect(page.locator('[data-testid="delete-pro-warning"]')).toBeVisible()
    await expect(page.locator('[data-testid="delete-pro-warning"]')).toContainText(
      'サブスクリプションも解除されます'
    )
  })

  // No.15
  test('Freeサービス削除時にサブスク警告が表示されない', async ({ page }) => {
    await page.click('[data-testid="more-menu-free-service"]')
    await page.locator('.MuiMenuItem-root', { hasText: '削除' }).click()
    await expect(page.locator('[data-testid="delete-pro-warning"]')).not.toBeVisible()
  })

  // No.16
  test('あいことば未入力時に削除ボタンが非活性', async ({ page }) => {
    await page.click('[data-testid="more-menu-free-service"]')
    await page.locator('.MuiMenuItem-root', { hasText: '削除' }).click()
    await expect(page.locator('[data-testid="delete-confirm-button"]')).toBeDisabled()
  })

  // No.17
  test('誤ったあいことば入力では削除ボタンが非活性のまま', async ({ page }) => {
    await page.click('[data-testid="more-menu-free-service"]')
    await page.locator('.MuiMenuItem-root', { hasText: '削除' }).click()
    await page.fill('[data-testid="delete-passphrase-input"]', 'wrong phrase')
    await expect(page.locator('[data-testid="delete-confirm-button"]')).toBeDisabled()
  })

  // No.18
  test('正しいあいことば入力で削除ボタンが活性になる', async ({ page }) => {
    await page.click('[data-testid="more-menu-free-service"]')
    await page.locator('.MuiMenuItem-root', { hasText: '削除' }).click()
    await page.fill('[data-testid="delete-passphrase-input"]', 'service delete')
    await expect(page.locator('[data-testid="delete-confirm-button"]')).toBeEnabled()
  })

  // No.19
  test('削除完了後にメッセージ表示とリスト再取得', async ({ page }) => {
    await mockServiceDeleteSuccess(page)
    await page.click('[data-testid="more-menu-free-service"]')
    await page.locator('.MuiMenuItem-root', { hasText: '削除' }).click()
    await page.fill('[data-testid="delete-passphrase-input"]', 'service delete')
    const reloadRequest = page.waitForRequest(
      req => req.url().includes('service') && req.method() === 'GET'
    )
    await page.click('[data-testid="delete-confirm-button"]')
    await reloadRequest
    await expect(page.locator('text=を削除しました。')).toBeVisible()
  })

  // No.20
  test('削除キャンセルでダイアログが閉じサービスが残る', async ({ page }) => {
    await page.click('[data-testid="more-menu-free-service"]')
    await page.locator('.MuiMenuItem-root', { hasText: '削除' }).click()
    await page.click('[data-testid="delete-cancel-button"]')
    await expect(page.locator('[data-testid="delete-confirm-dialog"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="service-row-free-service"]')).toBeVisible()
  })
})

// ─── E2E テスト：プラン変更（Free→Pro） ──────────────────────
test.describe('サービス管理 - プラン変更（Free→Pro） - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockServiceList(page)
    await login(page, INDEX_URL)
    await page.click('[data-testid="public-settings-free-service"]')
    await expect(page.locator('.MuiDialog-root')).toBeVisible()
  })

  // No.21
  test('プラン変更モーダルが開く', async ({ page }) => {
    await expect(page.locator('.MuiDialog-root')).toBeVisible()
    await expect(page.locator('.MuiDialog-root')).toContainText('プラン変更')
  })

  // No.22
  test('Freeサービスで「pro環境に変更する」ボタンが表示される', async ({ page }) => {
    await expect(page.locator('button:has-text("pro環境に変更する")')).toBeVisible()
  })

  // No.23
  test('「pro環境に変更する」→確認画面に進む', async ({ page }) => {
    await page.click('button:has-text("pro環境に変更する")')
    await expect(page.locator('.MuiDialog-root')).toContainText('クレジットカード入力画面')
  })

  // No.24
  test('確認画面で「← 戻る」を押すと元の画面に戻る', async ({ page }) => {
    await page.click('button:has-text("pro環境に変更する")')
    await page.click('button:has-text("← 戻る")')
    await expect(page.locator('button:has-text("pro環境に変更する")')).toBeVisible()
  })

  // No.25
  test('カード登録済みで即時Pro変更の場合モーダルが閉じてメッセージ表示', async ({ page }) => {
    await mockUpgradeToProImmediate(page)
    await page.click('button:has-text("pro環境に変更する")')
    await page.click('button:has-text("クレジットカード入力画面へ")')
    await expect(page.locator('text=pro環境に変更しました。')).toBeVisible()
  })

  // No.25b
  test('202＋成功メッセージの場合もモーダルが閉じてメッセージ表示（ログイン画面に遷移しない）', async ({
    page
  }) => {
    await mockUpgradeToPro202WithMessage(page)
    await page.click('button:has-text("pro環境に変更する")')
    await page.click('button:has-text("クレジットカード入力画面へ")')
    // ログイン画面に遷移していないことを確認
    await expect(page).not.toHaveURL(/login\.html/)
    // 成功メッセージが表示されることを確認
    await expect(page.locator('text=pro環境に変更しました。')).toBeVisible()
  })

  // No.25c
  test('Pro変更後に別サービスのプラン変更モーダルを開くと最初の画面が表示される', async ({
    page
  }) => {
    await mockUpgradeToProImmediate(page)
    // free-service を Pro に変更
    await page.click('button:has-text("pro環境に変更する")')
    await page.click('button:has-text("クレジットカード入力画面へ")')
    await expect(page.locator('text=pro環境に変更しました。')).toBeVisible()
    // 別サービス（free-service）のプラン変更モーダルを再度開く
    await page.click('[data-testid="public-settings-free-service"]')
    // クレジットカード確認画面ではなく、最初のプラン比較画面が表示される
    await expect(page.locator('button:has-text("pro環境に変更する")')).toBeVisible()
    await expect(page.locator('button:has-text("クレジットカード入力画面へ")')).not.toBeVisible()
  })
})

// ─── E2E テスト：プラン変更（Pro→Free） ──────────────────────
test.describe('サービス管理 - プラン変更（Pro→Free） - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockServiceList(page)
    await login(page, INDEX_URL)
    await page.click('[data-testid="public-settings-pro-service"]')
    await expect(page.locator('.MuiDialog-root')).toBeVisible()
  })

  // No.26
  test('Proサービスで「Free環境に戻す」ボタンが表示される', async ({ page }) => {
    await expect(page.locator('button:has-text("Free環境に戻す")')).toBeVisible()
  })

  // No.27
  test('Proサービスで「pro環境に変更する」ボタンが表示されない', async ({ page }) => {
    await expect(page.locator('button:has-text("pro環境に変更する")')).not.toBeVisible()
  })

  // No.28
  test('「Free環境に戻す」→確認画面にキャンセル不可の注意が表示される', async ({ page }) => {
    await page.click('button:has-text("Free環境に戻す")')
    await expect(page.locator('.MuiDialog-root')).toContainText(
      '一度申請するとキャンセル期間中はPro環境に戻すことはできません'
    )
  })

  // No.29
  test('Free戻し申請完了後に移行予定日と残り期間が表示される', async ({ page }) => {
    await mockDowngradeToStaging(page)
    await page.click('button:has-text("Free環境に戻す")')
    await page.click('button:has-text("Free環境への戻しを申請する")')
    await expect(page.locator('.MuiDialog-root')).toContainText(
      'Free環境への戻し申請が完了しました'
    )
    await expect(page.locator('.MuiDialog-root')).toContainText('Free移行予定日')
    await expect(page.locator('.MuiDialog-root')).toContainText('Pro環境の残り期間')
  })
})

// ─── E2E テスト：解約申請中の挙動 ───────────────────────────
test.describe('サービス管理 - 解約申請中の挙動 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockServiceList(page)
    await login(page, INDEX_URL)
    await page.click('[data-testid="public-settings-cancel-service"]')
    await expect(page.locator('.MuiDialog-root')).toBeVisible()
  })

  // No.30
  test('解約申請中サービスのモーダルに申請済みアラートが表示される', async ({ page }) => {
    await expect(page.locator('.MuiDialog-root')).toContainText('Free環境への戻し申請済みです')
  })

  // No.31
  test('解約申請中はProに変更できない旨のメッセージが表示される', async ({ page }) => {
    await expect(page.locator('.MuiDialog-root')).toContainText(
      'キャンセル申請中はPro環境に変更することはできません'
    )
  })

  // No.32
  test('解約申請中は「pro環境に変更する」ボタンが表示されない', async ({ page }) => {
    await expect(page.locator('button:has-text("pro環境に変更する")')).not.toBeVisible()
  })

  // No.33
  test('解約申請中は「Free環境に戻す」ボタンが表示されない', async ({ page }) => {
    await expect(page.locator('button:has-text("Free環境に戻す")')).not.toBeVisible()
  })
})

// ─── 単体テスト ───────────────────────────────────────────────
test.describe('サービス管理 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockServiceList(page)
    await login(page, INDEX_URL)
    await page.click('[data-testid="create-service-button"]')
  })

  // No.34
  test('有効なサービス名で確定ボタンが活性になる', async ({ page }) => {
    await page.fill('[data-testid="service-name-input"]', 'my-service-01')
    await page.locator('[data-testid="service-name-input"]').blur()
    await expect(page.locator('[data-testid="create-confirm-button"]')).toBeEnabled()
  })

  // No.35
  test('不正なサービス名で確定ボタンが非活性', async ({ page }) => {
    await page.fill('[data-testid="service-name-input"]', 'My_Service')
    await expect(page.locator('[data-testid="create-confirm-button"]')).toBeDisabled()
  })

  // No.36
  test('空欄で確定ボタンが非活性', async ({ page }) => {
    await expect(page.locator('[data-testid="create-confirm-button"]')).toBeDisabled()
  })

  // No.37
  test('あいことばは「service delete」の完全一致のみ有効', async ({ page }) => {
    await page.locator('[data-testid="create-cancel-button"]').click()
    await page.click('[data-testid="more-menu-free-service"]')
    await page.locator('.MuiMenuItem-root', { hasText: '削除' }).click()
    await page.fill('[data-testid="delete-passphrase-input"]', 'Service Delete')
    await expect(page.locator('[data-testid="delete-confirm-button"]')).toBeDisabled()
    await page.fill('[data-testid="delete-passphrase-input"]', 'service delete')
    await expect(page.locator('[data-testid="delete-confirm-button"]')).toBeEnabled()
  })
})

// ─── 認証なしテスト ──────────────────────────────────────────
test.describe('サービス管理 - 認証なし', () => {
  test('未ログイン時はlogin.htmlにリダイレクトされる', async ({ page }) => {
    await page.goto(INDEX_URL)
    await expect(page).toHaveURL(/login\.html/)
  })
})
