/**
 * 管理画面 - 基本情報テスト
 * 認証が必要なため、beforeEach で login() を呼び出します。
 * API仕様:
 *   GET /d/?_uid           → { feed: { title: uid } }
 *   GET /d/?_accesstoken   → { feed: { title: 'test-token-xxxx' } }
 *   GET /d/?e              → { contributor: [{ uri: 'urn:vte.cx:apikey:test-apikey-xxxx' }] }
 *   PUT /d/?_accesskey     → { feed: { title: 'ok' } }  (token更新)
 *   PUT /d/?_apikey        → { feed: { title: 'ok' } }  (apikey更新)
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
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('管理画面 - 基本情報 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockBasicInfo(page)
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
})
