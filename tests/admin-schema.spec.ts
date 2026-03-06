/**
 * 管理画面 - スキーマテスト
 * 認証が必要なため、beforeEach で login() を呼び出します。
 *
 * API仕様:
 *   GET /d/_settings/template?e         → VtecxApp.Entry (content.______text にスキーマ定義テキスト)
 *   GET /d/_settings/template_property?f&l=* → VtecxApp.Entry[] (和名一覧)
 *   PUT /d/                             → [] (保存)
 *
 * data-testid一覧:
 *   schema-table, schema-col-janame, schema-col-type
 *   schema-row-{schema_name}
 *   add-schema-button
 *   schema-modal, schema-modal-close
 *   schema-field-name, schema-field-error
 *   schema-parent-path
 *   type-dropdown, type-option-{type}
 *   search-index-input, search-index-chip-{value}, chip-delete
 *   schema-save-button
 *   edit-icon, add-child-icon
 *
 * green[50] = rgb(232, 245, 233)
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'
import { login } from '../helpers/auth'

const SCHEMA_URL = `${ENV.BASE_URL}/admin.html#/schema`

// スキーマ定義テキスト (content.______text)
// name(string) → 子なし
// address      → 子あり (address/city)
//  city(string) → 子なし
const MOCK_TEMPLATE_TEXT = `
name(string)
address
 city(string)
`

// VtecxApp.Entry 形式のテンプレートレスポンス
const MOCK_TEMPLATE_ENTRY = {
  id: '/_settings/template,1',
  content: { ______text: MOCK_TEMPLATE_TEXT },
  rights: 'name:name\n'
}

// 和名リスト (template_property)
const MOCK_WAMEI_LIST = [
  {
    id: '/_settings/template_property/name,1',
    title: '名前',
    link: [{ ___href: '/_settings/template_property/name', ___rel: 'self' }]
  },
  {
    id: '/_settings/template_property/address,1',
    title: '住所',
    link: [{ ___href: '/_settings/template_property/address', ___rel: 'self' }]
  },
  {
    id: '/_settings/template_property/address.city,1',
    title: '市区町村',
    link: [{ ___href: '/_settings/template_property/address.city', ___rel: 'self' }]
  }
]

async function mockSchemas(page: any) {
  // GET /d/_settings/template_property?f&l=*  ← 先に登録（より具体的なパターン）
  await page.route('**/d/_settings/template_property**', (route: any) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_WAMEI_LIST)
      })
    } else {
      route.continue()
    }
  })
  // GET /d/_settings/template?e  ← 後に登録
  await page.route('**/d/_settings/template?e**', (route: any) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TEMPLATE_ENTRY)
      })
    } else {
      route.continue()
    }
  })
}

// ── E2E テスト ──────────────────────────────────────────────
test.describe('管理画面 - スキーマ - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await mockSchemas(page)
    await login(page, SCHEMA_URL)
  })

  // No.1
  test('スキーマ一覧がテーブルに表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="schema-table"]')).toBeVisible()
    await expect(page.locator('[data-testid="schema-col-janame"]')).toBeVisible()
    await expect(page.locator('[data-testid="schema-col-type"]')).toBeVisible()
  })

  // No.2
  test('子を持つ行は緑背景で表示される', async ({ page }) => {
    // green[50] = rgb(232, 245, 233)
    await expect(page.locator('[data-testid="schema-row-address"]')).toHaveCSS(
      'background-color',
      'rgb(232, 245, 233)'
    )
  })

  // No.3
  test('「追加」ボタンでモーダルが開く', async ({ page }) => {
    await page.click('[data-testid="add-schema-button"]')
    await expect(page.locator('[data-testid="schema-modal"]')).toBeVisible()
  })

  // No.4
  test('数字始まり項目名でエラー表示', async ({ page }) => {
    await page.click('[data-testid="add-schema-button"]')
    await page.fill('[data-testid="schema-field-name"]', '1name')
    await expect(page.locator('[data-testid="schema-field-error"]')).toContainText(
      '項目名は半角英字から開始してください。'
    )
  })

  // No.5
  test('検索インデックスをEnterで追加できる', async ({ page }) => {
    await page.click('[data-testid="add-schema-button"]')
    await page.fill('[data-testid="search-index-input"]', 'name')
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid="search-index-chip-name"]')).toBeVisible()
  })

  // No.6
  test('型のドロップダウンで各型を選択できる', async ({ page }) => {
    await page.click('[data-testid="add-schema-button"]')
    await page.click('[data-testid="type-dropdown"]')
    for (const t of ['String', 'Integer', 'Date', 'Boolean']) {
      await expect(page.locator(`[data-testid="type-option-${t}"]`)).toBeVisible()
    }
  })

  // No.7
  test('編集アイコンでモーダルが開き既存値が設定される', async ({ page }) => {
    await page.click('[data-testid="schema-row-name"] [data-testid="edit-icon"]')
    await expect(page.locator('[data-testid="schema-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="schema-field-name"]')).toHaveValue('name')
  })

  // No.8
  test('＋アイコンで子追加モーダルが開き親パス自動設定', async ({ page }) => {
    await page.click('[data-testid="schema-row-address"] [data-testid="add-child-icon"]')
    await expect(page.locator('[data-testid="schema-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="schema-parent-path"]')).toHaveValue('address')
  })
})

// ── 単体テスト ─────────────────────────────────────────────
test.describe('管理画面 - スキーマ - 単体テスト', () => {
  test.beforeEach(async ({ page }) => {
    await mockSchemas(page)
    await login(page, SCHEMA_URL)
    await page.click('[data-testid="add-schema-button"]')
  })

  // No.9〜13 型ドロップダウン選択肢確認
  for (const typeName of ['String', 'Integer', 'Date', 'Boolean', 'Float']) {
    test(`型ドロップダウンに ${typeName} が含まれる`, async ({ page }) => {
      await page.click('[data-testid="type-dropdown"]')
      await expect(page.locator(`[data-testid="type-option-${typeName}"]`)).toBeVisible()
    })
  }

  // No.14〜17 型選択動作
  for (const typeName of ['String', 'Integer', 'Date', 'Boolean']) {
    test(`「${typeName}」を選択できる`, async ({ page }) => {
      await page.click('[data-testid="type-dropdown"]')
      await page.click(`[data-testid="type-option-${typeName}"]`)
      await expect(page.locator('[data-testid="type-dropdown"]')).toContainText(typeName)
    })
  }

  // No.18
  test('型未選択時にデフォルト値が設定されている', async ({ page }) => {
    await expect(page.locator('[data-testid="type-dropdown"]')).not.toBeEmpty()
  })

  // No.19 検索インデックスChip
  test('Enterでチップが追加される', async ({ page }) => {
    await page.fill('[data-testid="search-index-input"]', 'name')
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid="search-index-chip-name"]')).toBeVisible()
  })

  // No.20
  test('複数のチップを追加できる', async ({ page }) => {
    for (const val of ['name', 'age']) {
      await page.fill('[data-testid="search-index-input"]', val)
      await page.keyboard.press('Enter')
    }
    await expect(page.locator('[data-testid="search-index-chip-name"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-index-chip-age"]')).toBeVisible()
  })

  // No.21
  test('同じ値を重複追加できない', async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      await page.fill('[data-testid="search-index-input"]', 'name')
      await page.keyboard.press('Enter')
    }
    await expect(page.locator('[data-testid="search-index-chip-name"]')).toHaveCount(1)
  })

  // No.22
  test('空文字はチップに追加されない', async ({ page }) => {
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid^="search-index-chip-"]')).toHaveCount(0)
  })

  // No.23
  test('Chipの×ボタンで削除できる', async ({ page }) => {
    await page.fill('[data-testid="search-index-input"]', 'name')
    await page.keyboard.press('Enter')
    await page.click('[data-testid="search-index-chip-name"] [data-testid="chip-delete"]')
    await expect(page.locator('[data-testid="search-index-chip-name"]')).not.toBeVisible()
  })

  // No.24
  test('1つ削除しても他のChipは残る', async ({ page }) => {
    for (const val of ['name', 'age']) {
      await page.fill('[data-testid="search-index-input"]', val)
      await page.keyboard.press('Enter')
    }
    await page.click('[data-testid="search-index-chip-name"] [data-testid="chip-delete"]')
    await expect(page.locator('[data-testid="search-index-chip-age"]')).toBeVisible()
    await expect(page.locator('[data-testid="search-index-chip-name"]')).not.toBeVisible()
  })

  // No.25
  test('Enterを押すと入力欄がクリアされる', async ({ page }) => {
    await page.fill('[data-testid="search-index-input"]', 'name')
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid="search-index-input"]')).toHaveValue('')
  })

  // No.26〜28 バリデーション
  test('項目名：英小文字始まり → エラーなし', async ({ page }) => {
    await page.fill('[data-testid="schema-field-name"]', 'username')
    await expect(page.locator('[data-testid="schema-field-error"]')).not.toBeVisible()
  })

  test('項目名：数字始まり → エラー表示', async ({ page }) => {
    await page.fill('[data-testid="schema-field-name"]', '1name')
    await expect(page.locator('[data-testid="schema-field-error"]')).toBeVisible()
  })

  test('項目名：日本語含む → エラー表示', async ({ page }) => {
    await page.fill('[data-testid="schema-field-name"]', 'ユーザー名')
    await expect(page.locator('[data-testid="schema-field-error"]')).toBeVisible()
  })

  // No.29
  test('数字始まり項目名エラーの文言が正確', async ({ page }) => {
    await page.fill('[data-testid="schema-field-name"]', '1name')
    await expect(page.locator('[data-testid="schema-field-error"]')).toHaveText(
      '項目名は半角英字から開始してください。'
    )
  })

  // No.30〜31 表示ロジック
  test('子を持つ行が緑背景で表示される', async ({ page }) => {
    await page.locator('[data-testid="schema-modal-close"]').click()
    // green[50] = rgb(232, 245, 233)
    await expect(page.locator('[data-testid="schema-row-address"]')).toHaveCSS(
      'background-color',
      'rgb(232, 245, 233)'
    )
  })

  test('子を持たない行は通常背景で表示される', async ({ page }) => {
    await page.locator('[data-testid="schema-modal-close"]').click()
    const bg = await page
      .locator('[data-testid="schema-row-name"]')
      .evaluate((el: HTMLElement) => window.getComputedStyle(el).backgroundColor)
    expect(bg).not.toBe('rgb(232, 245, 233)')
  })
})
