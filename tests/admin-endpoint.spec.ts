/**
 * 管理画面 - エンドポイント管理テスト（DataBrowser）
 * 認証が必要なため、beforeEach で login() を呼び出します。
 *
 * 現在の実装はデータブラウザ形式:
 *   - /d/ 配下をフォルダ構造でブラウズ
 *   - パンくずナビゲーション
 *   - エントリの追加・削除・詳細表示
 *   - ACL / スキーマ / Alias の編集モーダル
 *   - 検索モーダル
 *   - ページネーション（50件/ページ）
 *
 * API 仕様:
 *   GET  /d/?f&c&l=*                  → カウント取得
 *   GET  /d/?f&l=50&_pagination=1,50  → ページネーションインデックス
 *   GET  /d/?f&n={page}&l=50          → ルート一覧
 *   GET  /d/{path}?f&n={page}&l=50    → 子エントリ一覧
 *   GET  /d/{path}?e                  → エントリ詳細
 *   POST /d/                          → エントリ追加
 *   PUT  /d/                          → エントリ更新（スキーマ・ACL・Alias）
 *   DELETE /d/{path}?_rf              → エントリ削除（再帰）
 *   GET  /d/_group?f                  → グループ一覧（ACL編集用）
 *   GET  /d/_settings/template?e      → スキーマテンプレート
 *
 * data-testid 一覧:
 *   breadcrumb-root          パンくず「ルート」
 *   breadcrumb-{label}       パンくず中間項目
 *   add-entry-button         追加 IconButton
 *   reload-button            リロード IconButton
 *   search-button            検索 IconButton
 *   entry-table              TableContainer（エントリ一覧）
 *   entry-row-{name}         TableRow（name = パスの末尾セグメント）
 *   entry-name-{name}        エントリ名 Typography
 *   detail-button-{name}     詳細 IconButton
 *   pagination-prev          前へ IconButton
 *   pagination-current       ページ番号 Typography
 *   pagination-next          次へ IconButton
 *   browser-empty            空状態 Box
 *   browser-empty-message    「これより先にデータはありません」Typography
 *   browser-error            エラー Alert
 *   browser-reload-button    エラー時リロード Button
 *   entry-detail-panel       詳細パネル（EntryDetailPanel）
 *   edit-schema-link         スキーマ「追加・変更」Link
 *   edit-acl-link            ACL「追加・変更」Link
 *   edit-alias-link          Alias「追加・変更」Link
 *   delete-confirm-ok        削除確認 OK
 *   delete-confirm-cancel    削除確認キャンセル
 *   entry-form-dialog        追加/編集 Dialog
 *   key-input                キー入力 TextField（input要素）
 *   key-error                キーバリデーションエラー span
 *   submit-entry-button      追加/更新ボタン（最終ステップ）
 *   acl-edit-dialog          ACL編集 Dialog
 *   group-search-input       グループ検索 TextField（input要素）
 *   acl-save-button          ACL更新ボタン
 *   schema-edit-dialog       スキーマ編集 Dialog
 *   schema-field-search      スキーマフィールド検索 TextField（input要素）
 *   schema-save-button       スキーマ更新ボタン
 *   alias-edit-dialog        Alias編集 Dialog
 *   alias-key-input          Aliasキー入力 TextField（input要素）
 *   alias-add-button         Alias追加 Button
 *   alias-save-button        Alias更新ボタン
 *   search-dialog            検索 Dialog
 *   search-path-input        検索パス TextField（input要素）
 *   search-condition-add     条件追加 Button
 *   search-execute-button    検索実行 Button
 *   search-result-table      検索結果 Box
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

const EP_URL = `${ENV.BASE_URL}/admin.html#/endpoint`

// ─── モックデータ ────────────────────────────────────────────

const MOCK_ROOT_ENTRIES: any[] = [
  {
    id: '/users,1',
    title: 'ユーザー',
    link: [{ ___href: '/users', ___rel: 'self' }],
    contributor: [{ uri: 'urn:vte.cx:acl:/_group/$admin,CRUD' }, { uri: 'urn:vte.cx:acl:+,R' }],
    updated: '2024-01-01T00:00:00Z'
  },
  {
    id: '/items,1',
    title: '商品',
    link: [{ ___href: '/items', ___rel: 'self' }],
    contributor: [{ uri: 'urn:vte.cx:acl:/_group/$admin,CRUD' }],
    updated: '2024-01-02T00:00:00Z'
  },
  {
    id: '/_settings,1',
    title: 'システム設定',
    link: [{ ___href: '/_settings', ___rel: 'self' }],
    contributor: [{ uri: 'urn:vte.cx:acl:/_group/$admin,CRUDE' }],
    updated: '2024-01-03T00:00:00Z'
  }
]

// Alias テスト用: alternate link が1件設定済みの /users エントリ
const MOCK_USERS_WITH_ALIAS: any = {
  id: '/users,1',
  title: 'ユーザー',
  link: [
    { ___href: '/users', ___rel: 'self' },
    { ___href: '/items/users-alias', ___rel: 'alternate' }
  ],
  contributor: [{ uri: 'urn:vte.cx:acl:/_group/$admin,CRUD' }, { uri: 'urn:vte.cx:acl:+,R' }],
  updated: '2024-01-01T00:00:00Z'
}

const MOCK_CHILD_ENTRIES: any[] = [
  {
    id: '/users/u001,1',
    title: 'ユーザー1',
    link: [{ ___href: '/users/u001', ___rel: 'self' }],
    contributor: [{ uri: 'urn:vte.cx:acl:/_group/$admin,CRUD' }],
    updated: '2024-01-10T00:00:00Z'
  }
]

const MOCK_GROUPS: any[] = [
  { link: [{ ___href: '/_group/$content', ___rel: 'self' }] },
  { link: [{ ___href: '/_group/$useradmin', ___rel: 'self' }] },
  { link: [{ ___href: '/_group/myteam', ___rel: 'self' }] }
]

const MOCK_TEMPLATE_ENTRY = {
  id: '/_settings/template,1',
  content: { ______text: '\nname(string)\nage(int)\n' },
  rights: 'name:name\n'
}

// ─── モックヘルパー ──────────────────────────────────────────

async function mockRootEntries(page: any, entries = MOCK_ROOT_ENTRIES) {
  await page.route('**/d/?f&c&l=*', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: String(entries.length) } })
    })
  )
  await page.route('**/d/?f&l=50&_pagination=**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/d/?f&n=**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(entries)
    })
  )
}

async function mockGroups(page: any, groups = MOCK_GROUPS) {
  await page.route('**/d/_group?f**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(groups)
    })
  )
}

async function mockGroupsForbidden(page: any) {
  await page.route('**/d/_group?f**', (route: any) =>
    route.fulfill({
      status: 403,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'Forbidden' } })
    })
  )
}

async function mockTemplate(page: any) {
  await page.route('**/_settings/template?e**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_TEMPLATE_ENTRY)
    })
  )
}

async function mockPutSuccess(page: any) {
  await page.route('**/d/', (route: any) => {
    if (route.request().method() === 'PUT')
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    else route.continue()
  })
}

async function mockDeleteSuccess(page: any) {
  await page.route('**?_rf', (route: any) => {
    if (route.request().method() === 'DELETE')
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    else route.continue()
  })
}

// ── E2E テスト（データブラウザ基本操作）─────────────────────
test.describe('管理画面 - エンドポイント管理 - E2E（基本操作）', () => {
  test.beforeEach(async ({ page }) => {
    await mockRootEntries(page)
    await mockGroups(page)
    await mockTemplate(page)
    await login(page, EP_URL)
  })

  // No.1
  test('エントリ一覧テーブルが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="entry-table"]')).toBeVisible()
  })

  // No.2
  test('ルートのエントリが一覧に表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="entry-row-users"]')).toBeVisible()
    await expect(page.locator('[data-testid="entry-row-items"]')).toBeVisible()
  })

  // No.3
  test('「/_」始まりのシステムエントリはグレー背景で表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="entry-row-_settings"]')).toHaveCSS(
      'background-color',
      /rgb\(245, 245, 245\)|rgb\(250, 250, 250\)|rgba\(0, 0, 0, 0\.04\)/
    )
  })

  // No.4
  test('パンくずに「ルート」が表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="breadcrumb-root"]')).toBeVisible()
    await expect(page.locator('[data-testid="breadcrumb-root"]')).toHaveText('ルート')
  })

  // No.5
  test('行をクリックするとパンくずが更新される', async ({ page }) => {
    await page.route('**/d/users?f**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHILD_ENTRIES)
      })
    )
    await page.route('**/d/users?e**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROOT_ENTRIES[0])
      })
    )
    await page.click('[data-testid="entry-row-users"]')
    await expect(page.locator('[data-testid="breadcrumb-users"]')).toBeVisible()
  })

  // No.6
  test('「追加」ボタンで追加モーダルが開く', async ({ page }) => {
    await page.click('[data-testid="add-entry-button"]')
    await expect(page.locator('[data-testid="entry-form-dialog"]')).toBeVisible()
  })

  // No.7
  test('「リロード」ボタンでデータが再取得される', async ({ page }) => {
    // beforeEach のルートをそのまま使い、リクエスト発火を waitForRequest で検出する
    const requestPromise = page.waitForRequest(
      req => req.url().includes('/d/') && req.url().includes('f') && req.url().includes('n=')
    )
    await page.click('[data-testid="reload-button"]')
    await requestPromise // リロードで API が呼ばれることを確認
  })

  // No.8
  test('「検索」ボタンで検索モーダルが開く', async ({ page }) => {
    await page.click('[data-testid="search-button"]')
    await expect(page.locator('[data-testid="search-dialog"]')).toBeVisible()
  })

  // No.9
  test('詳細ボタンで詳細パネルが表示される', async ({ page }) => {
    // 詳細(ⓘ)ボタンは右ペインの EntryPreviewPanel を開く
    await page.route('**/d/users?e**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROOT_ENTRIES[0])
      })
    )
    await page.click('[data-testid="detail-button-users"]')
    await expect(page.locator('[data-testid="entry-preview-panel"]')).toBeVisible()
  })

  // No.10
  test('削除確認OKでサーバーに削除リクエストと一覧再取得が行われる', async ({ page }) => {
    await mockDeleteSuccess(page)
    await page.route('**/d/users?e**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROOT_ENTRIES[0])
      })
    )
    await page.click('[data-testid="detail-button-users"]')
    await expect(page.locator('[data-testid="entry-preview-panel"]')).toBeVisible()
    await page.click('[data-testid="entry-preview-panel"] [aria-label="削除"]')
    // 削除確認OK後に一覧取得APIが呼ばれることを確認
    const reloadRequest = page.waitForRequest(
      req => req.url().includes('/d/') && req.url().includes('f') && req.url().includes('n=')
    )
    await page.click('[data-testid="delete-confirm-ok"]')
    await reloadRequest
  })

  // No.11
  test('削除確認キャンセルでエントリが残る', async ({ page }) => {
    await page.route('**/d/users?e**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROOT_ENTRIES[0])
      })
    )
    await page.click('[data-testid="detail-button-users"]')
    await expect(page.locator('[data-testid="entry-preview-panel"]')).toBeVisible()
    await page.click('[data-testid="entry-preview-panel"] [aria-label="削除"]')
    await page.click('[data-testid="delete-confirm-cancel"]')
    await expect(page.locator('[data-testid="entry-row-users"]')).toBeVisible()
  })
})

// ── E2E テスト（追加モーダル）───────────────────────────────
test.describe('管理画面 - エンドポイント管理 - E2E（追加モーダル）', () => {
  test.beforeEach(async ({ page }) => {
    await mockRootEntries(page)
    await mockGroups(page)
    await mockTemplate(page)
    await login(page, EP_URL)
    await page.click('[data-testid="add-entry-button"]')
    await expect(page.locator('[data-testid="entry-form-dialog"]')).toBeVisible()
  })

  // No.12
  test('キー入力欄が表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="key-input"]')).toBeVisible()
  })

  // No.13
  test('スラッシュ含むキー名でバリデーションエラーが表示される', async ({ page }) => {
    await page.fill('[data-testid="key-input"]', 'my/key')
    await page.locator('[data-testid="key-input"]').blur()
    await expect(page.locator('[data-testid="key-error"]')).toBeVisible()
  })

  // No.14
  test('有効なキー名ではエラーが表示されない', async ({ page }) => {
    await page.fill('[data-testid="key-input"]', 'mykey123')
    await page.locator('[data-testid="key-input"]').blur()
    await expect(page.locator('[data-testid="key-error"]')).not.toBeVisible()
  })

  // No.15
  test('キー未入力時は「次へ」ボタンが非活性（ルート直下はキー必須）', async ({ page }) => {
    await expect(page.locator('button:has-text("次へ")')).toBeDisabled()
  })

  // No.16
  test('有効なキーを入力すると「次へ」ボタンが活性になる', async ({ page }) => {
    await page.fill('[data-testid="key-input"]', 'newentry')
    await page.locator('[data-testid="key-input"]').blur()
    await expect(page.locator('button:has-text("次へ")')).toBeEnabled()
  })

  // No.17
  test('ステッパーが3ステップで表示される（キー→スキーマ→ACL設定）', async ({ page }) => {
    // MuiStepper内のStepLabelに限定することでstrict mode violationを回避
    const stepper = page.locator('.MuiStepper-root')
    await expect(stepper).toBeVisible()
    await expect(stepper.locator('.MuiStepLabel-label', { hasText: 'キー' }).first()).toBeVisible()
    await expect(stepper.locator('.MuiStepLabel-label', { hasText: 'スキーマ' })).toBeVisible()
    await expect(stepper.locator('.MuiStepLabel-label', { hasText: 'ACL設定' })).toBeVisible()
  })

  // No.18
  test('ACLステップで$adminがデフォルト表示される', async ({ page }) => {
    await page.fill('[data-testid="key-input"]', 'newentry')
    await page.locator('[data-testid="key-input"]').blur()
    await page.click('button:has-text("次へ")')
    await page.click('button:has-text("次へ")')
    await expect(
      page.locator('[data-testid="entry-form-dialog"] >> text=サービス管理者')
    ).toBeVisible()
  })

  // No.19
  test('グループ一覧取得中はローディングが表示される', async ({ page }) => {
    // beforeEach でモーダルを開いた時点でグループAPIが実行済みのため独立して実行する
    await mockRootEntries(page)
    await mockTemplate(page)
    // 遅延レスポンスを先に登録（後勝ち）
    await page.route('**/d/_group?f**', async (route: any) => {
      await new Promise(r => setTimeout(r, 2000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GROUPS)
      })
    })
    await login(page, EP_URL)
    await page.click('[data-testid="add-entry-button"]')
    await expect(page.locator('[data-testid="entry-form-dialog"]')).toBeVisible()
    await page.fill('[data-testid="key-input"]', 'newentry')
    await page.locator('[data-testid="key-input"]').blur()
    await page.click('button:has-text("次へ")')
    await page.click('button:has-text("次へ")')
    // 「グループ一覧を取得中…」はGroupSelector TextFieldのplaceholderに表示される
    await expect(page.locator('input[placeholder*="グループ一覧を取得中"]')).toBeVisible()
  })

  // No.20
  test('グループ取得403エラー時にACL設定不可メッセージが表示される', async ({ page }) => {
    // beforeEach でモーダルを開いた時点でグループAPIが実行済みのため、
    // このテストは beforeEach に依存せず独立して実行する
    await mockRootEntries(page)
    await mockGroupsForbidden(page) // 403 を先に登録（後勝ち）
    await mockTemplate(page)
    await login(page, EP_URL)
    await page.click('[data-testid="add-entry-button"]')
    await expect(page.locator('[data-testid="entry-form-dialog"]')).toBeVisible()
    await page.fill('[data-testid="key-input"]', 'newentry')
    await page.locator('[data-testid="key-input"]').blur()
    await page.click('button:has-text("次へ")')
    await page.click('button:has-text("次へ")')
    await expect(page.locator('text=ACL設定は管理者のみ利用できます')).toBeVisible()
  })
})

// ── E2E テスト（ACL編集モーダル）────────────────────────────
test.describe('管理画面 - エンドポイント管理 - E2E（ACL編集）', () => {
  test.beforeEach(async ({ page }) => {
    await mockRootEntries(page)
    await mockGroups(page)
    await mockTemplate(page)
    // 行クリックで /users に遷移すると EntryDetailPanel (entry-detail-panel) が表示される
    await page.route('**/d/users?f**', (route: any) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    )
    await page.route('**/d/users?e**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROOT_ENTRIES[0])
      })
    )
    await login(page, EP_URL)
    await page.click('[data-testid="entry-row-users"]')
    await expect(page.locator('[data-testid="entry-detail-panel"]')).toBeVisible()
    await page.click('[data-testid="edit-acl-link"]')
    await expect(page.locator('[data-testid="acl-edit-dialog"]')).toBeVisible()
  })

  // No.21
  test('ACL編集モーダルが開く', async ({ page }) => {
    await expect(page.locator('[data-testid="acl-edit-dialog"]')).toBeVisible()
  })

  // No.22
  test('既存のACL設定（$admin と +）が表示される', async ({ page }) => {
    await expect(
      page.locator('[data-testid="acl-edit-dialog"] >> text=サービス管理者')
    ).toBeVisible()
    await expect(
      page.locator('[data-testid="acl-edit-dialog"] >> text=ログイン可能な全ユーザ')
    ).toBeVisible()
  })

  // No.23
  test('グループ検索でグループを追加できる', async ({ page }) => {
    await page.fill('[data-testid="group-search-input"]', 'コンテンツ')
    // ドロップダウン内の ListItemButton を直接取得（position:fixed で Dialog 外に描画）
    const item = page.locator('.MuiListItemButton-root', { hasText: 'コンテンツ管理者' })
    await expect(item.first()).toBeVisible()
    await item.first().click()
    await expect(
      page.locator('[data-testid="acl-edit-dialog"] >> text=コンテンツ管理者')
    ).toBeVisible()
  })

  // No.24
  test('グループ検索でサービス管理者（$admin）がドロップダウンに表示されない', async ({ page }) => {
    await page.fill('[data-testid="group-search-input"]', 'admin')
    // ドロップダウンに他のグループが表示されることを先に確認（ドロップダウンが開いた状態）
    // $admin は除外されているため「サービス管理者」の ListItemButton が存在しないことを確認
    await page.waitForTimeout(300) // 入力後のフィルタリング待機
    // ListItemButton として「サービス管理者」が存在しないことを確認
    // （ACL カード内の Typography とは異なり、ListItemButton スコープで絞る）
    await expect(
      page.locator('.MuiListItemButton-root', { hasText: 'サービス管理者' })
    ).not.toBeAttached()
  })

  // No.25
  test('グループ並び順：「*（全員）」→「+（ログイン済）」の順', async ({ page }) => {
    await page.locator('[data-testid="group-search-input"]').click()
    // ドロップダウンは position:fixed の Paper で描画される
    // セクションラベル「共通」を含む Box をアンカーにしてドロップダウンを特定する
    const dropdownBox = page
      .locator('div')
      .filter({ hasText: /^共通$/ })
      .first()
    await expect(dropdownBox).toBeVisible()
    // ドロップダウン内（「共通」ラベルと同じ親 Paper の中）の ListItemButton を取得
    // 「全てのユーザ」「ログイン可能な全ユーザ」が先頭2件に来ることを確認
    await expect(
      page.locator('.MuiListItemButton-root', { hasText: '全てのユーザ（未ログイン含む）' }).first()
    ).toBeVisible()
    await expect(
      page.locator('.MuiListItemButton-root', { hasText: 'ログイン可能な全ユーザ' }).first()
    ).toBeVisible()
    // 並び順確認: 全てのユーザ が ログイン可能な全ユーザ より上にある
    const allUserBound = await page
      .locator('.MuiListItemButton-root', { hasText: '全てのユーザ（未ログイン含む）' })
      .first()
      .boundingBox()
    const loginUserBound = await page
      .locator('.MuiListItemButton-root', { hasText: 'ログイン可能な全ユーザ' })
      .first()
      .boundingBox()
    expect(allUserBound!.y).toBeLessThan(loginUserBound!.y)
  })

  // No.26
  test('ACL更新成功でモーダルが閉じる', async ({ page }) => {
    await mockPutSuccess(page)
    await page.click('[data-testid="acl-save-button"]')
    await expect(page.locator('[data-testid="acl-edit-dialog"]')).not.toBeVisible()
  })

  // No.27
  test('ユーザー検索タブに切り替えができる', async ({ page }) => {
    await page.locator('[data-testid="acl-edit-dialog"] input[value="user"]').click()
    await expect(
      page.locator(
        '[data-testid="acl-edit-dialog"] input[placeholder*="メールアドレスまたはユーザーID"]'
      )
    ).toBeVisible()
  })
})

// ── E2E テスト（スキーマ編集モーダル）───────────────────────
test.describe('管理画面 - エンドポイント管理 - E2E（スキーマ編集）', () => {
  test.beforeEach(async ({ page }) => {
    await mockRootEntries(page)
    await mockGroups(page)
    await mockTemplate(page)
    await page.route('**/d/users?f**', (route: any) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    )
    await page.route('**/d/users?e**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROOT_ENTRIES[0])
      })
    )
    await login(page, EP_URL)
    await page.click('[data-testid="entry-row-users"]')
    await expect(page.locator('[data-testid="entry-detail-panel"]')).toBeVisible()
    await page.click('[data-testid="edit-schema-link"]')
    await expect(page.locator('[data-testid="schema-edit-dialog"]')).toBeVisible()
  })

  // No.28
  test('スキーマ編集モーダルが開く', async ({ page }) => {
    await expect(page.locator('[data-testid="schema-edit-dialog"]')).toBeVisible()
  })

  // No.29
  test('スキーマフィールド検索欄が表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="schema-field-search"]')).toBeVisible()
  })

  // No.30
  test('フィールド検索でテンプレートのフィールドが表示される', async ({ page }) => {
    await page.locator('[data-testid="schema-field-search"]').click()
    await expect(
      page.locator('[data-testid="schema-edit-dialog"] .MuiPaper-root >> text=name')
    ).toBeVisible()
  })

  // No.31
  test('スキーマ更新成功でモーダルが閉じる', async ({ page }) => {
    await mockPutSuccess(page)
    await page.click('[data-testid="schema-save-button"]')
    await expect(page.locator('[data-testid="schema-edit-dialog"]')).not.toBeVisible()
  })
})

// ── E2E テスト（Alias編集モーダル）─────────────────────────
test.describe('管理画面 - エンドポイント管理 - E2E（Alias編集）', () => {
  test.beforeEach(async ({ page }) => {
    await mockRootEntries(page)
    await mockGroups(page)
    await mockTemplate(page)
    await page.route('**/d/users?f**', (route: any) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    )
    // Alias テストでは alternate link 付きエントリを返す
    await page.route('**/d/users?e**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USERS_WITH_ALIAS)
      })
    )
    await login(page, EP_URL)
    await page.click('[data-testid="entry-row-users"]')
    await expect(page.locator('[data-testid="entry-detail-panel"]')).toBeVisible()
    await page.click('[data-testid="edit-alias-link"]')
    await expect(page.locator('[data-testid="alias-edit-dialog"]')).toBeVisible()
  })

  // No.32
  test('Alias編集モーダルが開く', async ({ page }) => {
    await expect(page.locator('[data-testid="alias-edit-dialog"]')).toBeVisible()
  })

  // No.33
  test('Aliasキー入力欄が「/」で初期化されている', async ({ page }) => {
    await expect(page.locator('[data-testid="alias-key-input"]')).toHaveValue('/')
  })

  // No.34
  test('Alias追加ボタンは初期状態（「/」のみ）で非活性', async ({ page }) => {
    await expect(page.locator('[data-testid="alias-add-button"]')).toBeDisabled()
  })

  // No.35
  test('Alias更新成功でモーダルが閉じる', async ({ page }) => {
    await mockPutSuccess(page)
    // beforeEach で MOCK_USERS_WITH_ALIAS を使用しているため
    // モーダルを開いた時点で aliases に /items/users-alias が1件存在する
    // → alias-save-button が活性な状態でそのまま保存できる
    await expect(page.locator('[data-testid="alias-save-button"]')).toBeEnabled()
    await page.click('[data-testid="alias-save-button"]')
    await expect(page.locator('[data-testid="alias-edit-dialog"]')).not.toBeVisible()
  })

  // No.36a（Alias削除）
  test('Alias削除ボタンで一覧からエントリが消える', async ({ page }) => {
    // beforeEach で MOCK_USERS_WITH_ALIAS を使用しているため /items/users-alias が表示されている
    await expect(page.locator('text=/items/users-alias')).toBeVisible()
    // 削除ボタン（0番目）をクリック
    await page.click('[data-testid="alias-delete-0"]')
    // 一覧から消える
    await expect(page.locator('text=/items/users-alias')).not.toBeVisible()
    // aliases が0件でも更新ボタンは活性のまま（全削除して保存できる）
    await expect(page.locator('[data-testid="alias-save-button"]')).toBeEnabled()
  })
})

// ── E2E テスト（検索モーダル）───────────────────────────────
test.describe('管理画面 - エンドポイント管理 - E2E（検索）', () => {
  test.beforeEach(async ({ page }) => {
    await mockRootEntries(page)
    await mockGroups(page)
    await mockTemplate(page)
    await login(page, EP_URL)
    await page.click('[data-testid="search-button"]')
    await expect(page.locator('[data-testid="search-dialog"]')).toBeVisible()
  })

  // No.36
  test('検索モーダルが開く', async ({ page }) => {
    await expect(page.locator('[data-testid="search-dialog"]')).toBeVisible()
  })

  // No.37
  test('検索パス入力欄が「/」で初期化されている', async ({ page }) => {
    await expect(page.locator('[data-testid="search-path-input"]')).toHaveValue('/')
  })

  // No.38
  test('条件追加ボタンで絞り込み条件欄が追加される', async ({ page }) => {
    const beforeCount = await page
      .locator(
        '[data-testid="search-dialog"] .MuiGrid-root, [data-testid="search-dialog"] > div > div'
      )
      .count()
    await page.click('[data-testid="search-condition-add"]')
    // フィールド選択入力欄が新たに出現する
    await expect(
      page.locator('[data-testid="search-dialog"] input[placeholder="フィールドを選択..."]')
    ).toBeVisible()
  })

  // No.39
  test('検索実行で結果テーブルが表示される', async ({ page }) => {
    await page.route('**/d/?f**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROOT_ENTRIES)
      })
    )
    await page.click('[data-testid="search-execute-button"]')
    await expect(page.locator('[data-testid="search-result-table"]')).toBeVisible()
  })

  // No.40
  test('検索結果が0件のとき「該当するデータが見つかりませんでした」と表示される', async ({
    page
  }) => {
    await page.route('**/d/?f**', (route: any) => route.fulfill({ status: 204 }))
    await page.click('[data-testid="search-execute-button"]')
    await expect(page.locator('text=該当するデータが見つかりませんでした')).toBeVisible()
  })

  // No.41
  test('検索結果の行をクリックするとブラウザがそのパスに遷移する', async ({ page }) => {
    await page.route('**/d/?f**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([MOCK_ROOT_ENTRIES[0]])
      })
    )
    await page.route('**/d/users?f**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_CHILD_ENTRIES)
      })
    )
    await page.route('**/d/users?e**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROOT_ENTRIES[0])
      })
    )
    await page.click('[data-testid="search-execute-button"]')
    await expect(page.locator('[data-testid="search-result-table"]')).toBeVisible()
    await page.locator('[data-testid="search-result-table"] tbody tr').first().click()
    await expect(page.locator('[data-testid="search-dialog"]')).not.toBeVisible()
    await expect(page.locator('[data-testid="breadcrumb-users"]')).toBeVisible()
  })
})

// ── 単体テスト ──────────────────────────────────────────────
test.describe('管理画面 - エンドポイント管理 - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockRootEntries(page)
    await mockGroups(page)
    await mockTemplate(page)
    await login(page, EP_URL)
  })

  // No.42
  test('totalCountが50件超のとき「次へ」ボタンが活性', async ({ page }) => {
    await page.unroute('**/d/?f&c&l=*')
    await page.unroute('**/d/?f&n=**')
    const entries50 = Array.from({ length: 50 }, (_, i) => ({
      id: `/entry${i},1`,
      link: [{ ___href: `/entry${i}`, ___rel: 'self' }],
      updated: '2024-01-01T00:00:00Z'
    }))
    await page.route('**/d/?f&c&l=*', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: '60' } })
      })
    )
    await page.route('**/d/?f&n=**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(entries50)
      })
    )
    await login(page, EP_URL)
    await expect(page.locator('[data-testid="pagination-next"]')).toBeEnabled()
  })

  // No.43
  test('1ページ目では「前へ」ボタンが非活性', async ({ page }) => {
    await expect(page.locator('[data-testid="pagination-prev"]')).toBeDisabled()
  })

  // No.44
  test('パンくずに「ルート」テキストが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="breadcrumb-root"]')).toHaveText('ルート')
  })

  // No.45
  test('titleありのエントリはタイトルがメインで表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="entry-name-users"]')).toContainText('ユーザー')
  })

  // No.46
  test('「/_」始まりエントリはグレー文字で表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="entry-name-_settings"]')).toHaveCSS(
      'color',
      /rgb\(117, 117, 117\)|rgb\(97, 97, 97\)/
    )
  })

  // No.47
  test('エントリが0件の場合「これより先にデータはありません」と表示される', async ({ page }) => {
    await page.unroute('**/d/?f&n=**')
    await page.route('**/d/?f&n=**', (route: any) => route.fulfill({ status: 204 }))
    await login(page, EP_URL)
    await expect(page.locator('[data-testid="browser-empty-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="browser-empty-message"]')).toHaveText(
      'これより先にデータはありません'
    )
  })

  // No.48
  test('取得エラー時にエラーアラートとリロードボタンが表示される', async ({ page }) => {
    await page.unroute('**/d/?f&n=**')
    await page.route('**/d/?f&n=**', (route: any) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'Internal Server Error' } })
      })
    )
    await login(page, EP_URL)
    await expect(page.locator('[data-testid="browser-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="browser-reload-button"]')).toBeVisible()
  })

  // No.49
  test('キーバリデーション：スラッシュ含む → エラー表示', async ({ page }) => {
    await page.click('[data-testid="add-entry-button"]')
    await page.fill('[data-testid="key-input"]', 'my/key')
    await page.locator('[data-testid="key-input"]').blur()
    await expect(page.locator('[data-testid="key-error"]')).toBeVisible()
  })

  // No.50
  test('キーバリデーション：英数字のみ → エラーなし', async ({ page }) => {
    await page.click('[data-testid="add-entry-button"]')
    await page.fill('[data-testid="key-input"]', 'mykey123')
    await page.locator('[data-testid="key-input"]').blur()
    await expect(page.locator('[data-testid="key-error"]')).not.toBeVisible()
  })

  // No.51
  test('システムエントリの詳細パネルでスキーマ編集リンクが表示されない', async ({ page }) => {
    await page.click('[data-testid="detail-button-_settings"]')
    await expect(page.locator('[data-testid="edit-schema-link"]')).not.toBeVisible()
  })

  // No.52
  test('システムエントリの詳細パネルでACL編集リンクが表示されない', async ({ page }) => {
    await page.click('[data-testid="detail-button-_settings"]')
    await expect(page.locator('[data-testid="edit-acl-link"]')).not.toBeVisible()
  })

  // No.53
  test('ACL設定で $admin カードには「変更不可」バッジがある', async ({ page }) => {
    // 行クリックで遷移 → EntryDetailPanel から edit-acl-link をクリック
    await page.route('**/d/users?f**', (route: any) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    )
    await page.route('**/d/users?e**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_ROOT_ENTRIES[0])
      })
    )
    await page.click('[data-testid="entry-row-users"]')
    await expect(page.locator('[data-testid="entry-detail-panel"]')).toBeVisible()
    await page.click('[data-testid="edit-acl-link"]')
    await expect(page.locator('[data-testid="acl-edit-dialog"]')).toBeVisible()
    await expect(page.locator('[data-testid="acl-edit-dialog"] >> text=変更不可')).toBeVisible()
  })

  // No.54
  test('検索パスを変更するとURLプレビューが更新される', async ({ page }) => {
    await page.click('[data-testid="search-button"]')
    await page.fill('[data-testid="search-path-input"]', '/users')
    // text= に '?' を含むと正規表現として解釈されるため getByText で exact 一致する
    await expect(
      page.locator('[data-testid="search-dialog"]').getByText('/d/users?f', { exact: false })
    ).toBeVisible()
  })
})
