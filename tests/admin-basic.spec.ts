/**
 * 管理画面 - 基本情報テスト
 * 認証が必要なため、beforeEach で login() を呼び出します。
 * API仕様:
 *   GET /d/?_uid           → { feed: { title: uid } }
 *   GET /d/?_accesstoken   → { feed: { title: 'test-token-xxxx' } }
 *   GET /d/?e              → { contributor: [{ uri: 'urn:vte.cx:apikey:test-apikey-xxxx' }] }
 *   PUT /d/?_accesskey     → { feed: { title: 'ok' } }  (token更新)
 *   PUT /d/?_apikey        → { feed: { title: 'ok' } }  (apikey更新)
 *   GET /d/?_accesscount   → { feed: { title: '1234' } }
 *   GET /d/?_storageusage  → { feed: { title: '1048576' } }
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

const BASIC_URL = `${ENV.BASE_URL}/admin.html#/basic`

/** アクセストークン・APIKEYをモック */
async function mockBasicInfo(page: any) {
  // uid 取得
  await page.route('**/d/?_uid**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'test-uid-001' } })
      })
    else route.continue()
  })
  // アクセストークン取得
  await page.route('**/d/?_accesstoken**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'test-token-xxxx' } })
      })
    else route.continue()
  })
  // APIKEY取得（/d/?e）
  await page.route('**/d/?e**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          contributor: [{ uri: 'urn:vte.cx:apikey:test-apikey-xxxx' }]
        })
      })
    else route.continue()
  })
}

/** アクセスカウンタをモック（正常系） */
async function mockAccessCount(page: any, count = '1234') {
  await page.route('**/d/?_accesscount**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: count } })
      })
    else route.continue()
  })
}

/** アクセスカウンタを402エラーでモック */
async function mockAccessCount402(page: any) {
  await page.route('**/d/?_accesscount**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'Payment Required' } })
      })
    else route.continue()
  })
}

/** アクセスカウンタを500エラーでモック */
async function mockAccessCount500(page: any) {
  await page.route('**/d/?_accesscount**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'Internal Server Error' } })
      })
    else route.continue()
  })
}

/** データ使用量をモック（正常系） */
async function mockStorageUsage(page: any, bytes = '1048576') {
  await page.route('**/d/?_storageusage**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: bytes } })
      })
    else route.continue()
  })
}

/** データ使用量を402エラーでモック */
async function mockStorageUsage402(page: any) {
  await page.route('**/d/?_storageusage**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'Payment Required' } })
      })
    else route.continue()
  })
}

/** データ使用量を500エラーでモック */
async function mockStorageUsage500(page: any) {
  await page.route('**/d/?_storageusage**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'Internal Server Error' } })
      })
    else route.continue()
  })
}

/** アクセストークン更新成功をモック */
async function mockUpdateTokenSuccess(page: any) {
  await page.route('**/d/?_accesskey**', (route: any) => {
    if (route.request().method() === 'PUT')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'ok' } })
      })
    else route.continue()
  })
}

/** APIKEY更新成功をモック */
async function mockUpdateApikeySuccess(page: any) {
  await page.route('**/d/?_apikey**', (route: any) => {
    if (route.request().method() === 'PUT')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'ok' } })
      })
    else route.continue()
  })
}

// ── E2E テスト ──────────────────────────────────────────────
test.describe('管理画面 - 基本情報 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockBasicInfo(page)
    await mockAccessCount(page)
    await mockStorageUsage(page)
    await login(page, BASIC_URL)
  })

  // No.1
  test('サービス名・APIKEY・アクセストークンが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="service-name"]')).toBeVisible()
    await expect(page.locator('text=test-apikey-xxxx')).toBeVisible()
    await expect(page.locator('text=test-token-xxxx')).toBeVisible()
  })

  // No.2
  test('アクセストークン更新ダイアログが開く', async ({ page }) => {
    await page.click('[data-testid="update-token-button"]')
    await expect(page.locator('[data-testid="update-token-dialog"]')).toBeVisible()
  })

  // No.3
  test('OKでトークン更新され成功メッセージ表示', async ({ page }) => {
    await mockUpdateTokenSuccess(page)
    await page.click('[data-testid="update-token-button"]')
    await page.click('[data-testid="dialog-ok-button"]')
    await expect(page.locator('[data-testid="success-alert"]')).toContainText(
      'アクセストークンの更新を行いました。'
    )
  })

  // No.4
  test('APIKEYの更新ダイアログが開く', async ({ page }) => {
    await page.click('[data-testid="update-apikey-button"]')
    await expect(page.locator('[data-testid="update-apikey-dialog"]')).toBeVisible()
  })

  // No.4b
  test('OKでAPIKEY更新され成功メッセージ表示', async ({ page }) => {
    await mockUpdateApikeySuccess(page)
    await page.click('[data-testid="update-apikey-button"]')
    await page.click('[data-testid="dialog-ok-button"]')
    await expect(page.locator('[data-testid="success-alert"]')).toContainText(
      'APIKEYの更新を行いました。'
    )
  })

  // No.5
  test('コピーボタンでスナックバーが表示される', async ({ page }) => {
    // headless chromium では clipboard API が動作しないためモックする
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve() },
        configurable: true
      })
    })
    await page.reload()
    await page.click('[data-testid="copy-apikey-button"]')
    await expect(page.locator('[data-testid="success-snackbar"]')).toContainText('コピーしました。')
  })

  // No.9
  test('アクセスカウンタが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="access-count-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="access-count-value"]')).toBeVisible()
  })

  // No.10
  test('アクセスカウンタの数値が3桁カンマ区切りで表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="access-count-value"]')).toHaveText('1,234')
  })

  // No.11
  test('アクセスカウンタが402エラー時に上限超過メッセージが表示される', async ({ page }) => {
    await page.unroute('**/d/?_accesscount**')
    await mockAccessCount402(page)
    await page.reload()
    await expect(page.locator('[data-testid="access-count-limit-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="access-count-limit-error"]')).toContainText(
      'アクセス数の上限に達しました。'
    )
  })

  // No.12
  test('アクセスカウンタが402エラー時にカードの枠が赤くなる', async ({ page }) => {
    await page.unroute('**/d/?_accesscount**')
    await mockAccessCount402(page)
    await page.reload()
    const card = page.locator('[data-testid="access-count-card"]')
    await expect(card).toHaveCSS(
      'border-color',
      /rgb\(211, 47, 47\)|rgb\(198, 40, 40\)|rgb\(229, 57, 53\)/
    )
  })

  // No.13
  test('アクセスカウンタが500エラー時に警告メッセージが表示される', async ({ page }) => {
    await page.unroute('**/d/?_accesscount**')
    await mockAccessCount500(page)
    await page.reload()
    await expect(page.locator('[data-testid="access-count-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="access-count-error"]')).toContainText(
      'アクセスカウンタの取得に失敗しました。'
    )
  })

  // No.14
  test('データ使用量が表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="storage-usage-card"]')).toBeVisible()
    await expect(page.locator('[data-testid="storage-usage-value"]')).toBeVisible()
  })

  // No.15
  test('データ使用量がバイト単位で自動変換されて表示される', async ({ page }) => {
    // 1048576 bytes → 1 MB
    await expect(page.locator('[data-testid="storage-usage-value"]')).toContainText('MB')
  })

  // No.16
  test('データ使用量が402エラー時に上限超過メッセージが表示される', async ({ page }) => {
    await page.unroute('**/d/?_storageusage**')
    await mockStorageUsage402(page)
    await page.reload()
    await expect(page.locator('[data-testid="storage-usage-limit-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="storage-usage-limit-error"]')).toContainText(
      'ストレージの上限に達しました。'
    )
  })

  // No.17
  test('データ使用量が402エラー時にカードの枠が赤くなる', async ({ page }) => {
    await page.unroute('**/d/?_storageusage**')
    await mockStorageUsage402(page)
    await page.reload()
    const card = page.locator('[data-testid="storage-usage-card"]')
    await expect(card).toHaveCSS(
      'border-color',
      /rgb\(211, 47, 47\)|rgb\(198, 40, 40\)|rgb\(229, 57, 53\)/
    )
  })

  // No.18
  test('データ使用量が500エラー時に警告メッセージが表示される', async ({ page }) => {
    await page.unroute('**/d/?_storageusage**')
    await mockStorageUsage500(page)
    await page.reload()
    await expect(page.locator('[data-testid="storage-usage-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="storage-usage-error"]')).toContainText(
      'データ使用量の取得に失敗しました。'
    )
  })

  // No.19
  test('アクセスカウンタとデータ使用量はサービス名より上に表示される', async ({ page }) => {
    const accessCountCard = page.locator('[data-testid="access-count-card"]')
    const storageUsageCard = page.locator('[data-testid="storage-usage-card"]')
    const serviceNameCard = page.locator('[data-testid="service-name"]')

    const accessCountBox = await accessCountCard.boundingBox()
    const storageUsageBox = await storageUsageCard.boundingBox()
    const serviceNameBox = await serviceNameCard.boundingBox()

    expect(accessCountBox!.y).toBeLessThan(serviceNameBox!.y)
    expect(storageUsageBox!.y).toBeLessThan(serviceNameBox!.y)
  })
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('管理画面 - 基本情報 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockBasicInfo(page)
    await mockAccessCount(page)
    await mockStorageUsage(page)
    await login(page, BASIC_URL)
  })

  // No.6
  test('コピー完了スナックバーの文言が正確', async ({ page }) => {
    // headless chromium では clipboard API が動作しないためモックする
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: () => Promise.resolve() },
        configurable: true
      })
    })
    await page.reload()
    await page.click('[data-testid="copy-apikey-button"]')
    await expect(page.locator('[data-testid="success-snackbar"]')).toHaveText('コピーしました。')
  })

  // No.7
  test('トークン更新成功メッセージの文言が正確', async ({ page }) => {
    await mockUpdateTokenSuccess(page)
    await page.click('[data-testid="update-token-button"]')
    await page.click('[data-testid="dialog-ok-button"]')
    await expect(page.locator('[data-testid="success-alert"]')).toHaveText(
      'アクセストークンの更新を行いました。'
    )
  })

  // No.8
  test('APIKEY更新成功メッセージの文言が正確', async ({ page }) => {
    await mockUpdateApikeySuccess(page)
    await page.click('[data-testid="update-apikey-button"]')
    await page.click('[data-testid="dialog-ok-button"]')
    await expect(page.locator('[data-testid="success-alert"]')).toHaveText(
      'APIKEYの更新を行いました。'
    )
  })

  // No.20
  test('アクセスカウンタ上限超過メッセージの文言が正確', async ({ page }) => {
    await page.unroute('**/d/?_accesscount**')
    await mockAccessCount402(page)
    await page.reload()
    await expect(page.locator('[data-testid="access-count-limit-error"]')).toContainText(
      'アクセス数の上限に達しました。サービスへのアクセスが制限されています。'
    )
  })

  // No.21
  test('アクセスカウンタ取得失敗メッセージの文言が正確', async ({ page }) => {
    await page.unroute('**/d/?_accesscount**')
    await mockAccessCount500(page)
    await page.reload()
    await expect(page.locator('[data-testid="access-count-error"]')).toContainText(
      'アクセスカウンタの取得に失敗しました。'
    )
  })

  // No.22
  test('データ使用量上限超過メッセージの文言が正確', async ({ page }) => {
    await page.unroute('**/d/?_storageusage**')
    await mockStorageUsage402(page)
    await page.reload()
    await expect(page.locator('[data-testid="storage-usage-limit-error"]')).toContainText(
      'ストレージの上限に達しました。データの書き込みが制限されています。'
    )
  })

  // No.23
  test('データ使用量取得失敗メッセージの文言が正確', async ({ page }) => {
    await page.unroute('**/d/?_storageusage**')
    await mockStorageUsage500(page)
    await page.reload()
    await expect(page.locator('[data-testid="storage-usage-error"]')).toContainText(
      'データ使用量の取得に失敗しました。'
    )
  })

  // No.24
  test('アクセスカウンタ正常時にWarningAmberアイコンが表示されない', async ({ page }) => {
    const card = page.locator('[data-testid="access-count-card"]')
    await expect(
      card.locator('[data-testid="MuiWarningAmberIcon"], svg[data-icon]')
    ).not.toBeVisible()
  })

  // No.25
  test('データ使用量正常時にWarningAmberアイコンが表示されない', async ({ page }) => {
    const card = page.locator('[data-testid="storage-usage-card"]')
    await expect(
      card.locator('[data-testid="MuiWarningAmberIcon"], svg[data-icon]')
    ).not.toBeVisible()
  })

  // No.26
  test('アクセスカウンタが0件のとき「0件」と表示される', async ({ page }) => {
    await page.unroute('**/d/?_accesscount**')
    await mockAccessCount(page, '0')
    await page.reload()
    await expect(page.locator('[data-testid="access-count-value"]')).toHaveText('0')
  })

  // No.27
  test('データ使用量が0バイトのとき「0 B」と表示される', async ({ page }) => {
    await page.unroute('**/d/?_storageusage**')
    await mockStorageUsage(page, '0')
    await page.reload()
    await expect(page.locator('[data-testid="storage-usage-value"]')).toHaveText('0 B')
  })
})
