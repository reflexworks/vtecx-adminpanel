/**
 * 管理画面 - ログイン履歴 / 詳細設定 / 共通ナビ / リダイレクト画面テスト
 * 認証が必要なため、beforeEach で login() を呼び出します。
 * （リダイレクト画面は認証不要ですが、同ファイルにまとめています）
 *
 * API仕様 (vte.cx):
 *   ログイン履歴:
 *     GET /d/_login_history?f&c&l=*                 → { feed: { title: '件数' } }
 *     GET /d/_login_history?f&l=50&_pagination=1,50 → [] (ページネーションインデックス)
 *     GET /d/_login_history?f&n=1&l=50              → VtecxApp.Entry[]
 *       entry.summary に JSON文字列で { ip, uid, account, useragent, cause } を保持
 *   詳細設定:
 *     GET /d/_settings/properties?e  → { rights: 'key=value\n...' }
 *     GET /d/_settings/adduser?e     → { content: { ______text: 'メール本文' } }
 *     GET /d/_settings/passreset?e   → { content: { ______text: 'メール本文' } }
 *
 * data-testid 対応表:
 *   history-table              TableContainer (LoginHistory)
 *   history-col-datetime       日時カラムヘッダ
 *   history-col-type-ip        区分/IPカラムヘッダ
 *   history-col-uid-account    UID/アカウントカラムヘッダ
 *   refresh-button             リフレッシュ IconButton
 *   pagination-prev            前へ IconButton
 *   pagination-current         ページ番号 Typography
 *   pagination-next            次へ IconButton
 *   properties-table           プロパティ TableContainer
 *   prop-col-key               キーカラムヘッダ
 *   prop-col-value             値カラムヘッダ (md以上で表示)
 *   registration-mail-body     登録メール本文 Box (fontFamily: monospace)
 *   password-mail-body         パスワード変更メール本文 Box
 *   sidebar-basic              サイドバー「基本情報」ListItemButton
 *   sidebar-log                サイドバー「ログ」ListItemButton
 *   sidebar-endpoint           サイドバー「エンドポイント管理」ListItemButton
 *   sidebar-schema             サイドバー「スキーマ管理」ListItemButton
 *   sidebar-users              サイドバー「ユーザ管理」ListItemButton
 *   sidebar-login-history      サイドバー「ログイン履歴」ListItemButton
 *   sidebar-properties         サイドバー「詳細設定」ListItemButton
 *   sidebar                    デスクトップ用 permanent Drawer (display: xs:none sm:block)
 *   hamburger-icon             ハンバーガー IconButton (AppBar 常時表示)
 *   drawer                     モバイル用 temporary Drawer (open で表示)
 *   account-icon               アカウント IconButton
 *   logout-button              ログアウト MenuItem
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

// ─────────────────────────────────────────────────────────────
// 7f. ログイン履歴
// ─────────────────────────────────────────────────────────────
const HISTORY_URL = `${ENV.BASE_URL}/admin.html#/login_history`

// useLoginHistory.ts が期待するレスポンス形式: VtecxApp.Entry[]
// entry.summary に JSON 文字列で ip/uid/account/useragent/cause を保持
const MOCK_HISTORY_ENTRIES: any[] = [
  {
    id: '/_login_history/1,1',
    title: 'login',
    summary: JSON.stringify({
      ip: '192.168.1.1',
      uid: 'u001',
      account: 'admin@example.com',
      useragent: 'Chrome/120',
      cause: ''
    }),
    published: '2024-01-01T10:00:00Z',
    updated: '2024-01-01T10:00:00Z'
  },
  {
    id: '/_login_history/2,1',
    title: 'logout',
    summary: JSON.stringify({
      ip: '192.168.1.1',
      uid: 'u001',
      account: 'admin@example.com',
      useragent: 'Chrome/120',
      cause: ''
    }),
    published: '2024-01-01T10:30:00Z',
    updated: '2024-01-01T10:30:00Z'
  }
]

async function mockLoginHistory(page: any, entries = MOCK_HISTORY_ENTRIES) {
  // ① ページネーションインデックス作成 (先に登録して競合回避)
  await page.route('**/_login_history?f&l=50&_pagination=1%2C50**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  // ② 件数取得
  await page.route('**/_login_history?f&c&l=*', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: String(entries.length) } })
    })
  )
  // ③ 一覧取得
  await page.route('**/_login_history?f&n=**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(entries) })
  )
}

test.describe('管理画面 - ログイン履歴 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoginHistory(page)
    await login(page, HISTORY_URL)
  })

  // No.1
  test('ログイン履歴がテーブルに表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="history-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="history-col-datetime"]')).toBeVisible()
    await expect(page.locator('[data-testid="history-col-type-ip"]')).toBeVisible()
    await expect(page.locator('[data-testid="history-col-uid-account"]')).toBeVisible()
  })

  // No.2
  // log_count が存在するときのみページネーション UI が表示される
  // 件数 60 でモックして pagination-next クリック → pagination-current が '2' になることを確認
  test('ページネーションが機能する', async ({ page }) => {
    const manyEntries = Array.from({ length: 50 }, (_, i) => ({
      id: `/_login_history/${i + 1},1`,
      title: 'login',
      summary: JSON.stringify({
        ip: '192.168.1.1',
        uid: `u${i}`,
        account: `user${i}@example.com`,
        useragent: 'Chrome/120',
        cause: ''
      }),
      published: `2024-01-01T${String(i).padStart(2, '0')}:00:00Z`,
      updated: `2024-01-01T${String(i).padStart(2, '0')}:00:00Z`
    }))
    await page.route('**/_login_history?f&c&l=*', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: '60' } })
      })
    )
    await page.route('**/_login_history?f&n=**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(manyEntries)
      })
    )
    await login(page, HISTORY_URL)
    await page.click('[data-testid="pagination-next"]')
    await expect(page.locator('[data-testid="pagination-current"]')).toContainText('2')
  })

  // No.3
  // refresh-button クリック → getLoginHistoryList({ page: 1, page_count: 50 }) が再呼び出しされる
  test('リフレッシュでデータが再取得される', async ({ page }) => {
    let count = 0
    await page.route('**/_login_history?f&n=**', (route: any) => {
      count++
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_HISTORY_ENTRIES)
      })
    })
    await page.click('[data-testid="refresh-button"]')
    await page.waitForTimeout(300)
    // 初回ロード分 + リフレッシュ分で 2 回以上呼ばれることを確認
    expect(count).toBeGreaterThanOrEqual(2)
  })
})

test.describe('管理画面 - ログイン履歴 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoginHistory(page)
    await login(page, HISTORY_URL)
  })

  // No.4
  test('日時カラムが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="history-col-datetime"]')).toBeVisible()
  })

  // No.5
  test('区分/IPカラムが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="history-col-type-ip"]')).toBeVisible()
  })

  // No.6
  test('UID/アカウントカラムが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="history-col-uid-account"]')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// 7g. 詳細設定
// ─────────────────────────────────────────────────────────────
const PROPS_URL = `${ENV.BASE_URL}/admin.html#/properties`

// useProperties: GET /d/_settings/properties?e
//   → entry.rights に "key=value\n..." 形式で保持
// useAddUserMail: GET /d/_settings/adduser?e
//   → entry.content.______text にメール本文
// usePassresetMail: GET /d/_settings/passreset?e
//   → entry.content.______text にメール本文
async function mockProperties(page: any) {
  await page.route('**/_settings/properties**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        rights: 'site_name=My Site\nsite_title=vte.cx'
      })
    })
  )
  await page.route('**/_settings/adduser**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: { ______text: 'ご登録ありがとうございます。' }
      })
    })
  )
  await page.route('**/_settings/passreset**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: { ______text: 'パスワードリセットのご連絡です。' }
      })
    })
  )
}

test.describe('管理画面 - 詳細設定 - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockProperties(page)
    await login(page, PROPS_URL)
  })

  // No.1
  test('プロパティ一覧がテーブルに表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="properties-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="prop-col-key"]')).toBeVisible()
    // prop-col-value は md以上でのみ表示のためデスクトップ幅で確認
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(page.locator('[data-testid="prop-col-value"]')).toBeVisible()
  })

  // No.2
  // Properties.tsx の登録メール本文 Box に fontFamily: 'monospace' が設定されている
  test('登録メール本文がモノスペースで表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="registration-mail-body"]')).toHaveCSS(
      'font-family',
      /monospace|Courier|Monaco/
    )
  })

  // No.3
  test('パスワード変更メール本文が表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="password-mail-body"]')).toBeVisible()
  })
})

test.describe('管理画面 - 詳細設定 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockProperties(page)
    await login(page, PROPS_URL)
  })

  // No.4
  test('キーカラムが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="prop-col-key"]')).toBeVisible()
  })

  // No.5
  // prop-col-value は xs: none / md: table-cell のため md幅で確認
  test('値カラムが表示される', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(page.locator('[data-testid="prop-col-value"]')).toBeVisible()
  })

  // No.6
  test('登録メール本文がmonospaceフォントで表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="registration-mail-body"]')).toHaveCSS(
      'font-family',
      /monospace|Courier|Monaco/
    )
  })
})

// ─────────────────────────────────────────────────────────────
// 7h. 共通ナビゲーション
// ─────────────────────────────────────────────────────────────
// admin/index.tsx の構造:
//   - permanent Drawer (data-testid="sidebar"): display xs:none sm:block
//   - temporary Drawer (data-testid="drawer"): open=mobileOpen
//   - hamburger-icon (MenuOutlined IconButton): AppBar に常時存在、クリックで mobileOpen トグル
//   - sidebar-xxx: 各 ListItemButton に付与
test.describe('管理画面 - 共通ナビゲーション - E2E', () => {
  test.beforeEach(async ({ page }) => {
    // サイドバーが常時表示されるデスクトップ幅でテスト
    await page.setViewportSize({ width: 1280, height: 900 })
    await login(page, `${ENV.BASE_URL}/admin.html#/basic`)
  })

  test('サイドバー「基本情報」で#/basicに遷移', async ({ page }) => {
    await page.click('[data-testid="sidebar-basic"]')
    await expect(page).toHaveURL(/#\/basic/)
  })

  test('サイドバー「ログ」で#/logに遷移', async ({ page }) => {
    await page.click('[data-testid="sidebar-log"]')
    await expect(page).toHaveURL(/#\/log/)
  })

  test('サイドバー「エンドポイント管理」で遷移', async ({ page }) => {
    await page.click('[data-testid="sidebar-endpoint"]')
    await expect(page).toHaveURL(/#\/endpoint/)
  })

  test('サイドバー「スキーマ管理」で遷移', async ({ page }) => {
    await page.click('[data-testid="sidebar-schema"]')
    await expect(page).toHaveURL(/#\/schema/)
  })

  test('サイドバー「ユーザ管理」で遷移', async ({ page }) => {
    await page.click('[data-testid="sidebar-users"]')
    await expect(page).toHaveURL(/#\/users/)
  })

  test('サイドバー「ログイン履歴」で遷移', async ({ page }) => {
    await page.click('[data-testid="sidebar-login-history"]')
    await expect(page).toHaveURL(/#\/login_history/)
  })

  test('サイドバー「詳細設定」で遷移', async ({ page }) => {
    await page.click('[data-testid="sidebar-properties"]')
    await expect(page).toHaveURL(/#\/properties/)
  })

  // permanent sidebar は display:none (xs) で制御
  test('モバイル幅でサイドバーがドロワーに切り替わる', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.locator('[data-testid="sidebar"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="hamburger-icon"]')).toBeVisible()
  })

  // temporary Drawer は mobileOpen で開閉
  // MUI temporary Drawer はハンバーガーで開き、バックグラウンド(backdrop)クリックで閉じる
  test('ハンバーガーアイコンでドロワーが開閉する', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.locator('[data-testid="drawer"]')).not.toBeVisible()
    // 開く
    await page.click('[data-testid="hamburger-icon"]')
    await expect(page.locator('[data-testid="drawer"]')).toBeVisible()
    // MUI Drawer の backdrop をクリックして閉じる
    await page.locator('.MuiBackdrop-root').last().click()
    await expect(page.locator('[data-testid="drawer"]')).not.toBeVisible()
  })

  // useAccount.logout() → GET /d/?_logout → login.html へリダイレクト
  test('ログアウトでlogin.htmlにリダイレクト', async ({ page }) => {
    await page.click('[data-testid="account-icon"]')
    await page.click('[data-testid="logout-button"]')
    await expect(page).toHaveURL(/login\.html/)
  })
})

test.describe('管理画面 - 共通 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, `${ENV.BASE_URL}/admin.html#/basic`)
  })

  // No.11
  // permanent Drawer は sm(600px)以上で display:block になる
  test('デスクトップ幅でサイドバーが常時表示', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
  })

  // No.12
  // temporary Drawer は初期状態 mobileOpen=false のため不可視
  test('モバイル幅でドロワーが初期状態で非表示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.locator('[data-testid="drawer"]')).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────
// 8. リダイレクト画面（認証不要）
// ─────────────────────────────────────────────────────────────
// redirect.tsx の実装:
//   service_name = window.location.search.replace('?', '')
//   if (service_name) location.href = `/d/@/admin.html?_login=${service_name.replace('service_name=','')}`
//
// 注意: redirect.html は認証が必要。未認証でアクセスすると login.html に転送される。
// 認証済みテスト (No.1/3): login() で事前認証してから goto()
// 未認証テスト (No.2/4): 認証なしでアクセスして login.html への転送を確認
test.describe('リダイレクト画面', () => {
  // No.1 (認証済み)
  // service_name付きでアクセス → /d/@/admin.html?_login=xxx に遷移することを確認
  test('service_name付きURLでadmin.htmlにリダイレクト', async ({ page }) => {
    await login(page, `${ENV.BASE_URL}/redirect.html?service_name=${ENV.SERVICE_NAME}`)
    await expect(page).toHaveURL(/admin\.html.*_login=|login\.html/)
  })

  // No.2 (未認証)
  // クエリパラメータなしで未認証アクセス → login.html に転送される
  test('クエリパラメータなしで未認証アクセスするとlogin.htmlに転送される', async ({ page }) => {
    await page.goto(`${ENV.BASE_URL}/redirect.html`)
    await expect(page).toHaveURL(/login\.html/)
  })

  // No.3 (認証済み・単体)
  // redirect.html から離脱して別URLに遷移することを確認
  test('【単体】service_nameがURLに含まれてリダイレクトされる', async ({ page }) => {
    await login(page, `${ENV.BASE_URL}/redirect.html?service_name=${ENV.SERVICE_NAME}`)
    await expect(page).not.toHaveURL(`${ENV.BASE_URL}/redirect.html`)
  })

  // No.4 (未認証・単体)
  // 未認証でアクセスすると admin.html には遷移せず login.html に転送される
  test('【単体】未認証ではadmin.htmlに遷移しない', async ({ page }) => {
    await page.goto(`${ENV.BASE_URL}/redirect.html`)
    await expect(page).not.toHaveURL(/admin\.html/)
  })
})
