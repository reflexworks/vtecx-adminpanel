/**
 * 管理画面 - ユーザーテスト
 * 認証が必要なため、beforeEach で login() を呼び出します。
 *
 * API仕様 (vte.cx):
 *   GET    /d/_user?f&c&l=*                  → { feed: { title: '件数' } }
 *   GET    /d/_user?f&l=50&_pagination=1,50  → [] (ページネーションインデックス作成)
 *   GET    /d/_user?f&n=1&l=50              → VtecxApp.Entry[] (ユーザ一覧)
 *   GET    /d/_group/$admin?f&l=*           → VtecxApp.Entry[] (管理者一覧)
 *   DELETE /d/?_deleteuser={account}        → [] (削除)
 *   PUT    /d/?_revokeuser={account}        → [] (無効化)
 *   PUT    /d/?_activateuser={account}      → [] (有効化)
 *
 * data-testid 対応表:
 *   user-table                  TableContainer
 *   user-col-account            TableHead UID/アカウント列
 *   user-col-status             TableHead 状態列
 *   user-row-{uid}              TableRow (uid = link[0].___href から /_user/ を除去)
 *   admin-label                 管理者の Typography (is_admin=true のみ付与)
 *   status-chip-{uid}           Chip
 *   status-chip-toggle-{uid}    Chip の deleteIcon (KeyboardArrowDown)
 *   status-change-modal         BasicModal の Box (data-testid prop)
 *   radio-delete                「削除」FormControlLabel
 *   radio-disable               「無効」FormControlLabel (Activated時のみ表示)
 *   radio-enable                「有効」FormControlLabel (Revoked時のみ表示)
 *   disable-warning-alert       type=revokeuser 時の Alert
 *   apply-button                「適用」Button
 *   status-update-alert         成功/失敗 Alert (Users コンポーネント内)
 *   pagination-prev             前へ IconButton
 *   pagination-current          ページ番号 Typography
 *   pagination-next             次へ IconButton
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

const USERS_URL = `${ENV.BASE_URL}/admin.html#/users`

// ── モックデータ (VtecxApp.Entry 形式) ────────────────────
// uid は entry.link[0].___href から '/_user/' を除去した値
// status は entry.summary  ('Activated' | 'Revoked')
// account は entry.contributor[0].email または entry.title
const MOCK_USER_LIST: any[] = [
  {
    id: '/_user/u001,1',
    title: 'admin@example.com',
    summary: 'Activated',
    link: [{ ___href: '/_user/u001', ___rel: 'self' }],
    contributor: [{ email: 'admin@example.com' }],
    published: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z'
  },
  {
    id: '/_user/u002,1',
    title: 'user@example.com',
    summary: 'Activated',
    link: [{ ___href: '/_user/u002', ___rel: 'self' }],
    contributor: [{ email: 'user@example.com' }],
    published: '2024-01-02T00:00:00Z',
    updated: '2024-01-02T00:00:00Z'
  },
  {
    id: '/_user/u003,1',
    title: 'old@example.com',
    summary: 'Revoked',
    link: [{ ___href: '/_user/u003', ___rel: 'self' }],
    contributor: [{ email: 'old@example.com' }],
    published: '2024-01-03T00:00:00Z',
    updated: '2024-01-03T00:00:00Z'
  }
]

// 管理者グループ: u001 のみ管理者
// useUsers.ts: id から '/_group/$admin/' と ',{n}' を除いたものが uid キーになる
const MOCK_ADMIN_LIST: any[] = [
  {
    id: '/_group/$admin/u001,1',
    link: [{ ___href: '/_group/$admin/u001', ___rel: 'self' }]
  }
]

async function mockUsers(page: any, users = MOCK_USER_LIST) {
  // ① ページネーションインデックス作成 (先に登録して他パターンと競合回避)
  await page.route('**/_user?f&l=50&_pagination=1%2C50**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  // ② 件数取得
  await page.route('**/_user?f&c&l=*', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: String(users.length) } })
    })
  )
  // ③ 一覧取得
  await page.route('**/_user?f&n=**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(users) })
  )
  // ④ 管理者グループ
  // fetcher は fetch() を使うため $ はエンコードされない → '**/$admin**' でマッチ
  await page.route('**/$admin**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ADMIN_LIST)
    })
  )
}

async function mockUpdateStatusSuccess(page: any) {
  await page.route('**/?_revokeuser=**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/?_activateuser=**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
  await page.route('**/?_deleteuser=**', (route: any) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  )
}

// ── E2E テスト ──────────────────────────────────────────────
test.describe('管理画面 - ユーザー - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockUsers(page)
    await login(page, USERS_URL)
  })

  // No.1
  test('ユーザー一覧がテーブルに表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="user-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-col-account"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-col-status"]')).toBeVisible()
  })

  // No.2
  // admin_user は uid をキーとする辞書。u001 が管理者。
  // color は green[800] = rgb(46, 125, 50)
  // is_admin=true の場合のみ data-testid="admin-label" が付与される
  test('管理者ユーザーは「管理者」と緑色で表示', async ({ page }) => {
    const adminLabel = page.locator('[data-testid="user-row-u001"] [data-testid="admin-label"]')
    await expect(adminLabel).toBeVisible()
    await expect(adminLabel).toHaveCSS('color', 'rgb(46, 125, 50)')
  })

  // No.3
  // status_color: Activated → 'success', Revoked → undefined
  test('Activated は緑Chip、Revoked はデフォルトChip', async ({ page }) => {
    await expect(page.locator('[data-testid="status-chip-u002"]')).toHaveClass(
      /MuiChip-colorSuccess/
    )
    await expect(page.locator('[data-testid="status-chip-u003"]')).not.toHaveClass(
      /MuiChip-colorSuccess/
    )
  })

  // No.4
  // Chip の deleteIcon (KeyboardArrowDown) をクリック → ChangeStatusModal が開く
  test('▼ボタンでステータス変更モーダルが開く', async ({ page }) => {
    await page.click('[data-testid="status-chip-toggle-u002"]')
    await expect(page.locator('[data-testid="status-change-modal"]')).toBeVisible()
  })

  // No.5
  // Activated → 「削除」「無効」ラジオが表示、「有効」は非表示
  test('Activatedユーザーには削除と無効の選択肢', async ({ page }) => {
    await page.click('[data-testid="status-chip-toggle-u002"]')
    await expect(page.locator('[data-testid="radio-disable"]')).toBeVisible()
    await expect(page.locator('[data-testid="radio-delete"]')).toBeVisible()
  })

  // No.6
  // Revoked → 「削除」「有効」ラジオが表示、「無効」は非表示
  test('Revokedユーザーには削除と有効の選択肢', async ({ page }) => {
    await page.click('[data-testid="status-chip-toggle-u003"]')
    await expect(page.locator('[data-testid="radio-enable"]')).toBeVisible()
    await expect(page.locator('[data-testid="radio-delete"]')).toBeVisible()
  })

  // No.7
  // 「無効」ラジオ選択 → type='revokeuser' → disable-warning-alert が表示される
  test('「無効」選択で確認アラートが表示される', async ({ page }) => {
    await page.click('[data-testid="status-chip-toggle-u002"]')
    await page.click('[data-testid="radio-disable"]')
    await expect(page.locator('[data-testid="disable-warning-alert"]')).toBeVisible()
  })

  // No.8
  // 「適用」クリック後、afterChange が呼ばれ messeage state が更新される
  // Users コンポーネントの Alert (data-testid="status-update-alert") に表示される
  test('「適用」でステータスが変更され成功メッセージ', async ({ page }) => {
    await mockUpdateStatusSuccess(page)
    await page.click('[data-testid="status-chip-toggle-u002"]')
    await page.click('[data-testid="radio-disable"]')
    await page.click('[data-testid="apply-button"]')
    await expect(page.locator('[data-testid="status-update-alert"]')).toContainText(
      'ステータスを更新しました。'
    )
  })

  // No.9
  // user_count が存在する場合にのみページネーション UI が表示される
  // pagination-next クリック → page state が 2 になり pagination-current が '2' を表示
  test('ページネーションが機能する', async ({ page }) => {
    const manyUsers = Array.from({ length: 50 }, (_, i) => ({
      id: `/_user/u${i},1`,
      title: `user${i}@example.com`,
      summary: 'Activated',
      link: [{ ___href: `/_user/u${i}`, ___rel: 'self' }],
      contributor: [{ email: `user${i}@example.com` }],
      published: '2024-01-01T00:00:00Z',
      updated: '2024-01-01T00:00:00Z'
    }))
    // 件数 60 で返すことでページネーション UI を表示させる
    await page.route('**/_user?f&c&l=*', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: '60' } })
      })
    )
    await page.route('**/_user?f&n=**', (route: any) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(manyUsers)
      })
    )
    await login(page, USERS_URL)
    await page.click('[data-testid="pagination-next"]')
    await expect(page.locator('[data-testid="pagination-current"]')).toContainText('2')
  })
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('管理画面 - ユーザー - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockUsers(page)
    await login(page, USERS_URL)
  })

  // No.10〜14 ラジオボタン出し分け
  test('Activatedユーザーのモーダルに「無効」ラジオがある', async ({ page }) => {
    await page.click('[data-testid="status-chip-toggle-u002"]')
    await expect(page.locator('[data-testid="radio-disable"]')).toBeVisible()
  })

  test('Activatedユーザーのモーダルに「削除」ラジオがある', async ({ page }) => {
    await page.click('[data-testid="status-chip-toggle-u002"]')
    await expect(page.locator('[data-testid="radio-delete"]')).toBeVisible()
  })

  test('Activatedユーザーのモーダルに「有効」ラジオがない', async ({ page }) => {
    await page.click('[data-testid="status-chip-toggle-u002"]')
    await expect(page.locator('[data-testid="radio-enable"]')).not.toBeVisible()
  })

  test('Revokedユーザーのモーダルに「有効」ラジオがある', async ({ page }) => {
    await page.click('[data-testid="status-chip-toggle-u003"]')
    await expect(page.locator('[data-testid="radio-enable"]')).toBeVisible()
  })

  test('Revokedユーザーのモーダルに「無効」ラジオがない', async ({ page }) => {
    await page.click('[data-testid="status-chip-toggle-u003"]')
    await expect(page.locator('[data-testid="radio-disable"]')).not.toBeVisible()
  })

  // No.15
  // type 未選択 → disabled={!type} → apply-button が disabled
  test('ラジオ未選択時に「適用」ボタンが非活性', async ({ page }) => {
    await page.click('[data-testid="status-chip-toggle-u002"]')
    await expect(page.locator('[data-testid="apply-button"]')).toBeDisabled()
  })

  // No.16〜17
  test('Activated ステータスは緑Chipで表示', async ({ page }) => {
    await expect(page.locator('[data-testid="status-chip-u002"]')).toHaveClass(
      /MuiChip-colorSuccess/
    )
  })

  test('Revoked ステータスはデフォルトChipで表示', async ({ page }) => {
    await expect(page.locator('[data-testid="status-chip-u003"]')).not.toHaveClass(
      /MuiChip-colorSuccess/
    )
  })

  // No.18〜19
  test('管理者グループのユーザーに「管理者」ラベルが表示', async ({ page }) => {
    await expect(
      page.locator('[data-testid="user-row-u001"] [data-testid="admin-label"]')
    ).toBeVisible()
  })

  test('一般ユーザーには「管理者」ラベルが表示されない', async ({ page }) => {
    // is_admin=false の場合 data-testid="admin-label" は付与されないため not.toBeVisible()
    await expect(
      page.locator('[data-testid="user-row-u002"] [data-testid="admin-label"]')
    ).not.toBeVisible()
  })

  // No.20
  test('ステータス更新成功メッセージの文言が正確', async ({ page }) => {
    await mockUpdateStatusSuccess(page)
    await page.click('[data-testid="status-chip-toggle-u002"]')
    await page.click('[data-testid="radio-disable"]')
    await page.click('[data-testid="apply-button"]')
    await expect(page.locator('[data-testid="status-update-alert"]')).toContainText(
      'ステータスを更新しました。'
    )
  })
})
