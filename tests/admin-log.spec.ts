/**
 * 管理画面 - ログテスト
 * 認証が必要なため、beforeEach で login() を呼び出します。
 *
 * API仕様 (useLog.ts 参照):
 *   GET /d/_log?f&c&l=*                  → カウント取得 { feed: { title: "件数" } }
 *   GET /d/_log?f&l=50&_pagination=1,50  → ページネーションインデックス作成
 *   GET /d/_log?f&n={page}&l={page_count} → ログ一覧 (VtecxApp.Entry[])
 *
 * Entry フィールドマッピング:
 *   entry.subtitle  : ログレベル ('INFO' | 'ERROR' | 'WARN')
 *   entry.published : 日時 (ISO 8601)
 *   entry.title     : コンポーネント名
 *   entry.summary   : メッセージ内容
 *   entry.rights    : 詳細
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

const LOG_URL = `${ENV.BASE_URL}/admin.html#/log`

// useLog.ts が期待する VtecxApp.Entry[] 形式のモックデータ
const MOCK_LOG_ENTRIES = [
  {
    id: '/log/1',
    subtitle: 'INFO',
    published: '2024-01-01T10:00:00Z',
    title: 'auth',
    summary: 'Login success',
    rights: ''
  },
  {
    id: '/log/2',
    subtitle: 'ERROR',
    published: '2024-01-01T10:01:00Z',
    title: 'api',
    summary: 'Request failed',
    rights: 'detail info'
  },
  {
    id: '/log/3',
    subtitle: 'WARN',
    published: '2024-01-01T10:02:00Z',
    title: 'db',
    summary: 'Slow query',
    rights: ''
  }
]

/**
 * useLog.ts の3つのAPIエンドポイントをすべてモックする
 * ルーティング順序に注意: より具体的なパターンを先に登録する
 */
async function mockLogs(page: any, entries = MOCK_LOG_ENTRIES, total = entries.length) {
  // 1. カウント取得 (/d/_log?f&c&l=*)
  await page.route('**/d/_log*c*', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: String(total) } })
    })
  )
  // 2. ページネーションインデックス (/d/_log?f&l=50&_pagination=1,50)
  await page.route('**/d/_log*_pagination*', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  )
  // 3. ログ一覧 (/d/_log?f&n={page}&l={page_count})
  await page.route('**/d/_log**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(entries)
    })
  )
}

// ── E2E テスト ──────────────────────────────────────────────
test.describe('管理画面 - ログ - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogs(page)
    await login(page, LOG_URL)
  })

  // No.1
  test('ログ一覧がテーブルに表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="log-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="log-col-datetime"]')).toBeVisible()
    await expect(page.locator('[data-testid="log-col-level"]')).toBeVisible()
  })

  // No.2
  test('ERRORレベルの行は赤背景で表示される', async ({ page }) => {
    // Log.tsx: level === 'ERROR' のとき sx={{ background: red[50] }} = rgb(255, 235, 238)
    await expect(page.locator('[data-testid="log-row-error"]').first()).toHaveCSS(
      'background-color',
      /rgb\(255, 235, 238\)/
    )
  })

  // No.3
  test('1ページ目では「前へ」が非活性', async ({ page }) => {
    await expect(page.locator('[data-testid="pagination-prev"]')).toBeDisabled()
  })

  // No.4
  test('リフレッシュでデータが再取得される', async ({ page }) => {
    let callCount = 0
    // ログ一覧エンドポイント（n= を含む呼び出し）のみカウント
    await page.route('**/d/_log*n=*', (route: any) => {
      callCount++
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_LOG_ENTRIES)
      })
    })
    await page.reload()
    await page.click('[data-testid="refresh-button"]')
    await page.waitForTimeout(300)
    expect(callCount).toBeGreaterThanOrEqual(2)
  })
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('管理画面 - ログ - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogs(page)
    await login(page, LOG_URL)
  })

  // No.5
  test('INFOレベル行は通常背景（赤背景でない）', async ({ page }) => {
    // INFO 行は sx に background 指定なし → red[50] の色でないことを確認
    await expect(page.locator('[data-testid="log-row-info"]').first()).not.toHaveCSS(
      'background-color',
      /rgb\(255, 235, 238\)/
    )
  })

  // No.6
  test('WARNレベル行が表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="log-row-warn"]').first()).toBeVisible()
  })
})
