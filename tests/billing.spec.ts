/**
 * 課金情報画面テスト
 * 認証が必要なため、beforeEach で login() を呼び出します。
 *
 * API仕様:
 *   GET  /d/_user/{uid}/service?f        → VtecxApp.Entry[]
 *     contributor に以下のURIが含まれる
 *       urn:vte.cx:stripe:sub:{id}            → Pro課金中
 *       urn:vte.cx:stripe:cancel:{datetime}   → 解約申請中
 *       urn:vte.cx:stripe:payment_failed:{dt} → 支払い失敗
 *   GET  /d/?_billingportal              → 200 { feed: { title: 'StripeURL' } }
 *
 * data-testid 一覧:
 *   （課金情報画面はdata-testidが付与されていないため、
 *    テキスト・ロール・セレクタで検証する）
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

const BILLING_URL = `${ENV.BASE_URL}/index.html#/billing`

// ─── モックデータ ─────────────────────────────────────────────

/** Pro課金中サービスのみ */
const MOCK_PRO_SERVICES = [
  {
    id: '/_service/my-app,1',
    subtitle: 'production',
    published: '2024-01-01T00:00:00Z',
    link: [{ ___href: '/_user/14751/service/my-app', ___rel: 'self' }],
    contributor: [
      { uri: 'urn:vte.cx:acl:/_group/$admin,CRUD' },
      { uri: 'urn:vte.cx:stripe:sub:sub_ABC123' }
    ]
  },
  {
    id: '/_service/api-gw,2',
    subtitle: 'production',
    published: '2024-02-01T00:00:00Z',
    link: [{ ___href: '/_user/14751/service/api-gw', ___rel: 'self' }],
    contributor: [
      { uri: 'urn:vte.cx:stripe:sub:sub_DEF456' }
    ]
  }
]

/** 解約申請中を含む */
const MOCK_CANCEL_PENDING_SERVICES = [
  {
    id: '/_service/staging,1',
    subtitle: 'production',
    published: '2024-03-01T00:00:00Z',
    link: [{ ___href: '/_user/14751/service/staging', ___rel: 'self' }],
    contributor: [
      { uri: 'urn:vte.cx:stripe:sub:sub_GHI789' },
      { uri: 'urn:vte.cx:stripe:cancel:2026-05-31T23:59:59+09:00' }
    ]
  }
]

/** 支払い失敗を含む */
const MOCK_PAYMENT_FAILED_SERVICES = [
  {
    id: '/_service/legacy,1',
    subtitle: 'production',
    published: '2024-04-01T00:00:00Z',
    link: [{ ___href: '/_user/14751/service/legacy', ___rel: 'self' }],
    contributor: [
      { uri: 'urn:vte.cx:stripe:sub:sub_JKL012' },
      { uri: 'urn:vte.cx:stripe:payment_failed:2026-04-01T10:00:00+09:00' }
    ]
  }
]

/** 課金なし（subscriptionId なし） */
const MOCK_FREE_ONLY_SERVICES = [
  {
    id: '/_service/dev,1',
    subtitle: 'development',
    published: '2024-01-01T00:00:00Z',
    link: [{ ___href: '/_user/14751/service/dev', ___rel: 'self' }],
    contributor: []
  }
]

// ─── モックヘルパー ──────────────────────────────────────────

async function mockBillingServices(page: any, entries: any[]) {
  await page.route('**/d/_user/*/service**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entries) })
    else route.continue()
  })
}

async function mockBillingPortal(page: any) {
  await page.route('**/d/?_billingportal**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'https://billing.stripe.com/test-portal' } })
      })
    else route.continue()
  })
}

async function mockBillingPortalError(page: any) {
  await page.route('**/d/?_billingportal**', (route: any) => {
    if (route.request().method() === 'GET')
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ feed: { title: 'Error' } }) })
    else route.continue()
  })
}

// ─── E2E テスト：基本表示 ─────────────────────────────────────
test.describe('課金情報 - 基本表示 - E2E', () => {
  // No.1
  test('課金情報がない場合「課金情報はありません」が表示される', async ({ page }) => {
    await mockBillingServices(page, MOCK_FREE_ONLY_SERVICES)
    await login(page, BILLING_URL)
    await expect(page.locator('text=課金情報はありません')).toBeVisible()
  })

  // No.2
  test('Pro課金中サービスがある場合に課金セクションが表示される', async ({ page }) => {
    await mockBillingServices(page, MOCK_PRO_SERVICES)
    await login(page, BILLING_URL)
    await expect(page.locator('text=課金情報はありません')).not.toBeVisible()
    await expect(page.locator('text=今月の請求額の確認・登録クレジットカード・請求履歴')).toBeVisible()
  })

  // No.3
  test('Stripe Customer Portalボタンが表示される', async ({ page }) => {
    await mockBillingServices(page, MOCK_PRO_SERVICES)
    await login(page, BILLING_URL)
    await expect(page.locator('button:has-text("Stripe Customer Portalで確認する")')).toBeVisible()
  })

  // No.4
  test('Stripe Customer Portalボタンを押すと別タブで開かれる', async ({ page }) => {
    await mockBillingServices(page, MOCK_PRO_SERVICES)
    await mockBillingPortal(page)
    await login(page, BILLING_URL)
    const [newPage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.locator('button:has-text("Stripe Customer Portalで確認する")').first().click()
    ])
    await expect(newPage.url()).toContain('stripe.com')
    await newPage.close()
  })

  // No.5
  test('Stripe Customer Portalの取得失敗時にエラーが表示される', async ({ page }) => {
    await mockBillingServices(page, MOCK_PRO_SERVICES)
    await mockBillingPortalError(page)
    await login(page, BILLING_URL)
    await page.locator('button:has-text("Stripe Customer Portalで確認する")').first().click()
    await expect(page.locator('text=ポータルURLの取得に失敗しました')).toBeVisible()
  })
})

// ─── E2E テスト：解約申請中セクション ───────────────────────
test.describe('課金情報 - 解約申請中 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockBillingServices(page, MOCK_CANCEL_PENDING_SERVICES)
    await login(page, BILLING_URL)
  })

  // No.6
  test('Free環境へ戻し申請中セクションが表示される', async ({ page }) => {
    await expect(page.locator('text=Free環境へ戻し申請中のサービス')).toBeVisible()
  })

  // No.7
  test('解約申請中サービス名が一覧に表示される', async ({ page }) => {
    await expect(page.locator('text=staging')).toBeVisible()
  })

  // No.8
  test('期間満了日時が YYYY/MM/DD HH:mm:ss 形式で表示される', async ({ page }) => {
    const dateText = await page.locator('text=/\\d{4}\\/\\d{2}\\/\\d{2} \\d{2}:\\d{2}:\\d{2}/').textContent()
    expect(dateText).toMatch(/\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/)
  })
})

// ─── E2E テスト：支払い失敗セクション ───────────────────────
test.describe('課金情報 - 支払い失敗 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockBillingServices(page, MOCK_PAYMENT_FAILED_SERVICES)
    await login(page, BILLING_URL)
  })

  // No.9
  test('支払い失敗セクションが表示される', async ({ page }) => {
    await expect(page.locator('text=支払い失敗があるサービス')).toBeVisible()
  })

  // No.10
  test('支払い失敗サービス名が一覧に表示される', async ({ page }) => {
    await expect(page.locator('text=legacy')).toBeVisible()
  })

  // No.11
  test('支払い失敗セクション内にStripe Customer Portalボタンが表示される', async ({ page }) => {
    const failedSection = page.locator('.MuiCard-root').filter({ hasText: '支払い失敗があるサービス' })
    await expect(failedSection.locator('button:has-text("Stripe Customer Portalで確認する")')).toBeVisible()
  })

  // No.12
  test('失敗発生日時が YYYY/MM/DD HH:mm:ss 形式で表示される', async ({ page }) => {
    await expect(page.locator('text=/\\d{4}\\/\\d{2}\\/\\d{2} \\d{2}:\\d{2}:\\d{2}/')).toBeVisible()
  })
})

// ─── 単体テスト ───────────────────────────────────────────────
test.describe('課金情報 - 単体テスト', () => {
  // No.13
  test('stripe:sub: を持つサービスのみ課金中と見なされる', async ({ page }) => {
    // subtitleがproductionでもstripe:sub:がなければ課金情報なし
    await mockBillingServices(page, [
      {
        id: '/_service/no-sub,1',
        subtitle: 'production',
        published: '2024-01-01T00:00:00Z',
        link: [{ ___href: '/_user/14751/service/no-sub', ___rel: 'self' }],
        contributor: [{ uri: 'urn:vte.cx:acl:/_group/$admin,CRUD' }]
      }
    ])
    await login(page, BILLING_URL)
    await expect(page.locator('text=課金情報はありません')).toBeVisible()
  })

  // No.14
  test('解約申請中のみのサービスでも課金セクションが表示される', async ({ page }) => {
    await mockBillingServices(page, MOCK_CANCEL_PENDING_SERVICES)
    await login(page, BILLING_URL)
    await expect(page.locator('text=課金情報はありません')).not.toBeVisible()
  })

  // No.15
  test('支払い失敗のみのサービスでも課金セクションが表示される', async ({ page }) => {
    await mockBillingServices(page, MOCK_PAYMENT_FAILED_SERVICES)
    await login(page, BILLING_URL)
    await expect(page.locator('text=課金情報はありません')).not.toBeVisible()
  })

  // No.16
  test('link の ___href が /_user/{uid}/service/{name} 形式でもサービス名が正しく表示される', async ({ page }) => {
    await mockBillingServices(page, MOCK_CANCEL_PENDING_SERVICES)
    await login(page, BILLING_URL)
    await expect(page.locator('text=staging')).toBeVisible()
  })

  // No.17
  test('複数のPro課金中サービスが存在してもエラーにならない', async ({ page }) => {
    await mockBillingServices(page, MOCK_PRO_SERVICES)
    await login(page, BILLING_URL)
    await expect(page.locator('text=今月の請求額の確認')).toBeVisible()
  })

  // No.18
  test('APIが204（空レスポンス）を返しても「課金情報はありません」が表示される', async ({ page }) => {
    await page.route('**/d/_user/*/service**', (route: any) =>
      route.fulfill({ status: 204 })
    )
    await login(page, BILLING_URL)
    await expect(page.locator('text=課金情報はありません')).toBeVisible()
  })

  // No.19
  test('APIがエラーを返した場合にエラーメッセージが表示される', async ({ page }) => {
    await page.route('**/d/_user/*/service**', (route: any) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ feed: { title: 'Server Error' } }) })
    )
    await login(page, BILLING_URL)
    await expect(page.locator('text=データ取得に失敗しました')).toBeVisible()
  })
})
