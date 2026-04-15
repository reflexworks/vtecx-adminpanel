/**
 * パスワード変更画面テスト
 *
 * change_password.tsx の2モード対応:
 *
 * [tokenモード]
 *   URL に _RXID + _passreset_token が両方ある場合
 *   → /d/?_uid&_RXID=xxx でセッション確認
 *   → ステッパー表示（4ステップ）
 *   → 現在のパスワード入力欄なし（メールトークンで本人確認済み）
 *   → 完了後「ログインに戻る」リンク (data-testid="back-to-login-link")
 *   → 失敗時: 「パスワード変更に失敗しました。もう一度画面をリロードして実行してください。」
 *
 * [loggedinモード]
 *   _RXID・_passreset_token なし → /d/?_uid でログイン状態確認
 *   → ステッパー非表示
 *   → 現在のパスワード (old_password) 入力欄あり（必須）
 *   → 「メインに戻る」リンク (data-testid="back-to-main-link") → index.html（常時表示）
 *   → 失敗時: 「パスワード変更に失敗しました。旧パスワードをご確認のうえ、もう一度お試しください。」
 *   → 未ログイン時は authStatus: 'invalid' → エラーメッセージ表示
 *
 * data-testid 一覧:
 *   old-password              現在のパスワード入力欄（loggedinモードのみ）
 *   old-password-error        現在のパスワード未入力エラー（loggedinモードのみ）
 *   new-password              新しいパスワード入力欄
 *   new-password-error        新しいパスワードバリデーションエラー
 *   new-password-confirm      確認パスワード入力欄
 *   new-password-confirm-error 確認パスワード不一致エラー
 *   change-password-button    変更ボタン
 *   change-password-form      フォームコンテナ
 *   success-message           変更完了メッセージ
 *   token-error-message       トークン無効/未ログインエラーメッセージ
 *   verifying-message         検証中メッセージ
 *   back-to-login-link        ログインに戻るリンク（tokenモード）
 *   back-to-main-link         メインに戻るリンク（loggedinモード・常時表示）
 */
import { test, expect } from '@playwright/test'
import { ENV } from '../config/env'

// ── URL 定義 ────────────────────────────────────────────────
/** tokenモード: メールリンク経由 */
const TOKEN_URL = `${ENV.BASE_URL}/change_password.html#/?_RXID=validrxid&_passreset_token=validtoken`

/** loggedinモード: ログイン済みユーザーがメインから遷移 */
const LOGGEDIN_URL = `${ENV.BASE_URL}/change_password.html`

// ── モックヘルパー ──────────────────────────────────────────

/** tokenモード: RXID検証成功 */
async function mockTokenValid(page: any) {
  await page.route('**/d/?_uid**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'validuid' } })
    })
  )
}

/** tokenモード: RXID検証失敗（一般的な401） */
async function mockTokenInvalid(page: any) {
  await page.route('**/d/?_uid**', (route: any) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'Invalid token' } })
    })
  )
}

/** tokenモード: RXID使用済みエラー（トークンがあれば続行可能） */
async function mockTokenRxidUsed(page: any) {
  await page.route('**/d/?_uid**', (route: any) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'RXID has been used more than once.' } })
    })
  )
}

/** loggedinモード: ログイン済み状態 */
async function mockLoggedIn(page: any) {
  await page.route('**/d/?_uid**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'loggedinuid' } })
    })
  )
}

/** loggedinモード: 未ログイン状態 */
async function mockNotLoggedIn(page: any) {
  await page.route('**/d/?_uid**', (route: any) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'Unauthorized' } })
    })
  )
}

/** パスワード変更 API 成功 */
async function mockChangePasswordSuccess(page: any) {
  await page.route('**/d/?_changephash**', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'ok' } })
    })
  )
}

/** パスワード変更 API 失敗 */
async function mockChangePasswordFailure(page: any) {
  await page.route('**/d/?_changephash**', (route: any) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ feed: { title: 'Internal Server Error' } })
    })
  )
}

// ── E2E テスト（tokenモード）────────────────────────────────
test.describe('パスワード変更画面 - E2E（tokenモード）', () => {
  // No.1
  test('有効なURLでフォームが表示される', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(TOKEN_URL)
    await expect(page.locator('[data-testid="change-password-form"]')).toBeVisible()
  })

  // No.2
  test('無効なURLでエラーメッセージが表示される', async ({ page }) => {
    await mockTokenInvalid(page)
    await page.goto(LOGGEDIN_URL)
    await expect(page.locator('[data-testid="token-error-message"]')).toContainText(
      'このリンクは無効か、有効期限が切れています。'
    )
  })

  // No.3
  test('ページロード中に検証中メッセージが表示される', async ({ page }) => {
    await page.route('**/d/?_uid**', async (route: any) => {
      await new Promise(r => setTimeout(r, 1000))
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { title: 'validuid' } })
      })
    })
    await page.goto(TOKEN_URL)
    await expect(page.locator('[data-testid="verifying-message"]')).toBeVisible()
  })

  // No.4
  test('RXID使用済みでもトークンがあれば続行できる', async ({ page }) => {
    await mockTokenRxidUsed(page)
    await page.goto(TOKEN_URL)
    await expect(page.locator('[data-testid="change-password-form"]')).toBeVisible()
  })

  // No.5
  test('tokenモードでは現在のパスワード入力欄が表示されない', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(TOKEN_URL)
    await expect(page.locator('[data-testid="old-password"]')).not.toBeVisible()
  })

  // No.6
  test('有効なパスワードで変更完了メッセージが表示される', async ({ page }) => {
    await mockTokenValid(page)
    await mockChangePasswordSuccess(page)
    await page.goto(TOKEN_URL)
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      '新しいパスワードへの変更が完了しました。'
    )
  })

  // No.7
  test('ルール不満のパスワードでエラーが表示される', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(TOKEN_URL)
    await page.fill('[data-testid="new-password"]', 'pass')
    await page.locator('[data-testid="new-password"]').blur()
    await expect(page.locator('[data-testid="new-password-error"]')).toBeVisible()
  })

  // No.8
  test('確認パスワード不一致でエラーが表示される', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(TOKEN_URL)
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'Different1!')
    await page.locator('[data-testid="new-password-confirm"]').blur()
    await expect(page.locator('[data-testid="new-password-confirm-error"]')).toBeVisible()
  })

  // No.9
  test('初期表示時に変更ボタンが非活性になる', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(TOKEN_URL)
    await expect(page.locator('[data-testid="change-password-button"]')).toBeDisabled()
  })

  // No.10
  test('完了後に「ログインに戻る」リンクが表示される', async ({ page }) => {
    await mockTokenValid(page)
    await mockChangePasswordSuccess(page)
    await page.goto(TOKEN_URL)
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(page.locator('[data-testid="back-to-login-link"]')).toBeVisible()
  })

  // No.11
  test('「ログインに戻る」リンクでlogin.htmlに遷移する', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(TOKEN_URL)
    await page.click('[data-testid="back-to-login-link"]')
    await expect(page).toHaveURL(/login\.html/)
  })

  // No.12
  test('tokenモードではステッパーが表示される', async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(TOKEN_URL)
    await expect(page.locator('.MuiStepper-root')).toBeVisible()
  })

  // No.13
  test('パスワード変更失敗時にエラーメッセージが表示される', async ({ page }) => {
    await mockTokenValid(page)
    await mockChangePasswordFailure(page)
    await page.goto(TOKEN_URL)
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(
      page.locator(
        'text=パスワード変更に失敗しました。もう一度画面をリロードして実行してください。'
      )
    ).toBeVisible()
  })
})

// ── E2E テスト（loggedinモード）─────────────────────────────
test.describe('パスワード変更画面 - E2E（loggedinモード）', () => {
  // No.14
  test('ログイン済みでアクセスするとフォームが表示される', async ({ page }) => {
    await mockLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
    await expect(page.locator('[data-testid="change-password-form"]')).toBeVisible()
  })

  // No.15
  test('loggedinモードでは現在のパスワード入力欄が表示される', async ({ page }) => {
    await mockLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
    await expect(page.locator('[data-testid="old-password"]')).toBeVisible()
  })

  // No.16
  test('loggedinモードではステッパーが表示されない', async ({ page }) => {
    await mockLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
    await expect(page.locator('.MuiStepper-root')).not.toBeVisible()
  })

  // No.17
  test('loggedinモードでは常に「メインに戻る」リンクが表示される', async ({ page }) => {
    await mockLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
    // フォーム表示中（変更前）の段階で既に表示されていることを確認
    await expect(page.locator('[data-testid="back-to-main-link"]')).toBeVisible()
  })

  // No.18
  test('loggedinモードでは「ログインに戻る」リンクが表示されない', async ({ page }) => {
    await mockLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
    await expect(page.locator('[data-testid="back-to-login-link"]')).not.toBeVisible()
  })

  // No.19
  test('現在のパスワードが未入力の場合は変更ボタンが非活性になる', async ({ page }) => {
    await mockLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
    // 新しいパスワードと確認だけ入力して、現在のパスワードは入力しない
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeDisabled()
  })

  // No.20
  test('現在のパスワードが未入力でフォーカスを外すとエラーが表示される', async ({ page }) => {
    await mockLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
    await page.locator('[data-testid="old-password"]').click()
    await page.locator('[data-testid="old-password"]').blur()
    await expect(page.locator('[data-testid="old-password-error"]')).toBeVisible()
  })

  // No.21
  test('3項目すべて入力すると変更ボタンが活性になる', async ({ page }) => {
    await mockLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
    await page.fill('[data-testid="old-password"]', 'OldPassw0rd!')
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeEnabled()
  })

  // No.22
  test('旧パスワードを含めた有効な入力で変更完了メッセージが表示される', async ({ page }) => {
    await mockLoggedIn(page)
    await mockChangePasswordSuccess(page)
    await page.goto(LOGGEDIN_URL)
    await page.fill('[data-testid="old-password"]', 'OldPassw0rd!')
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      '新しいパスワードへの変更が完了しました。'
    )
  })

  // No.23
  test('「メインに戻る」リンクでindex.htmlに遷移する', async ({ page }) => {
    await mockLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
    await page.click('[data-testid="back-to-main-link"]')
    await expect(page).toHaveURL(/index\.html/)
  })

  // No.24
  test('未ログイン状態でアクセスするとエラーメッセージが表示される', async ({ page }) => {
    await mockNotLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
    await expect(page.locator('[data-testid="token-error-message"]')).toBeVisible()
  })

  // No.25
  test('旧パスワード誤り時のエラーメッセージが表示される', async ({ page }) => {
    await mockLoggedIn(page)
    await mockChangePasswordFailure(page)
    await page.goto(LOGGEDIN_URL)
    await page.fill('[data-testid="old-password"]', 'WrongOldPassw0rd!')
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(
      page.locator(
        'text=パスワード変更に失敗しました。旧パスワードをご確認のうえ、もう一度お試しください。'
      )
    ).toBeVisible()
  })
})

// ── 単体テスト（tokenモード）────────────────────────────────
test.describe('パスワード変更画面 - 単体テスト（tokenモード）', () => {
  test.beforeEach(async ({ page }) => {
    await mockTokenValid(page)
    await page.goto(TOKEN_URL)
  })

  // No.26
  test('tokenモードでは現在のパスワード入力欄が表示されない', async ({ page }) => {
    await expect(page.locator('[data-testid="old-password"]')).not.toBeVisible()
  })

  // No.27
  test('有効パスワードで一致時に変更ボタンが活性になる', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeEnabled()
  })

  // No.28
  test('確認パスワード不一致で変更ボタンが非活性のまま', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'Different1!')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeDisabled()
  })

  // No.29
  test('ルール不満のパスワードで変更ボタンが非活性のまま', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'pass')
    await page.fill('[data-testid="new-password-confirm"]', 'pass')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeDisabled()
  })

  // No.30
  test('パスワード：記号なし → エラー', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'Password1')
    await page.locator('[data-testid="new-password"]').blur()
    await expect(page.locator('[data-testid="new-password-error"]')).toBeVisible()
  })

  // No.31
  test('パスワード：7文字以下 → エラー', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'Pass0!')
    await page.locator('[data-testid="new-password"]').blur()
    await expect(page.locator('[data-testid="new-password-error"]')).toBeVisible()
  })

  // No.32
  test('パスワード：数字なし → エラー', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'Password!')
    await page.locator('[data-testid="new-password"]').blur()
    await expect(page.locator('[data-testid="new-password-error"]')).toBeVisible()
  })

  // No.33
  test('パスワード：大文字+小文字+数字+記号8文字以上 → エラーなし', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'Passw0rd!')
    await page.locator('[data-testid="new-password"]').blur()
    await expect(page.locator('[data-testid="new-password-error"]')).not.toBeVisible()
  })

  // No.34
  test('リンク無効メッセージの文言が正確', async ({ page }) => {
    await page.unroute('**/d/?_uid**')
    await mockTokenInvalid(page)
    await page.goto(LOGGEDIN_URL)
    await expect(page.locator('[data-testid="token-error-message"]')).toHaveText(
      'このリンクは無効か、有効期限が切れています。'
    )
  })

  // No.35
  test('変更完了メッセージの文言が正確（tokenモード）', async ({ page }) => {
    await mockChangePasswordSuccess(page)
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(page.locator('[data-testid="success-message"]')).toHaveText(
      '新しいパスワードへの変更が完了しました。'
    )
  })

  // No.36
  test('パスワード変更失敗メッセージの文言が正確（tokenモード）', async ({ page }) => {
    await mockChangePasswordFailure(page)
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(
      page.locator(
        'text=パスワード変更に失敗しました。もう一度画面をリロードして実行してください。'
      )
    ).toHaveText('パスワード変更に失敗しました。もう一度画面をリロードして実行してください。')
  })
})

// ── 単体テスト（loggedinモード）─────────────────────────────
test.describe('パスワード変更画面 - 単体テスト（loggedinモード）', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoggedIn(page)
    await page.goto(LOGGEDIN_URL)
  })

  // No.37
  test('ログイン済みモードでフォームが表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="change-password-form"]')).toBeVisible()
  })

  // No.38
  test('現在のパスワード入力欄が表示される', async ({ page }) => {
    await expect(page.locator('[data-testid="old-password"]')).toBeVisible()
  })

  // No.39
  test('ステッパーが表示されない', async ({ page }) => {
    await expect(page.locator('.MuiStepper-root')).not.toBeVisible()
  })

  // No.40
  test('フォーム表示中から「メインに戻る」リンクが表示されている', async ({ page }) => {
    await expect(page.locator('[data-testid="back-to-main-link"]')).toBeVisible()
  })

  // No.41
  test('フォーム表示中は「ログインに戻る」リンクが表示されない', async ({ page }) => {
    await expect(page.locator('[data-testid="back-to-login-link"]')).not.toBeVisible()
  })

  // No.42
  test('現在のパスワードのみ未入力で変更ボタンが非活性のまま', async ({ page }) => {
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeDisabled()
  })

  // No.43
  test('新しいパスワードのみ未入力で変更ボタンが非活性のまま', async ({ page }) => {
    await page.fill('[data-testid="old-password"]', 'OldPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeDisabled()
  })

  // No.44
  test('3項目すべて入力で変更ボタンが活性になる', async ({ page }) => {
    await page.fill('[data-testid="old-password"]', 'OldPassw0rd!')
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await expect(page.locator('[data-testid="change-password-button"]')).toBeEnabled()
  })

  // No.45
  test('現在のパスワード未入力エラーの文言が正確', async ({ page }) => {
    await page.locator('[data-testid="old-password"]').click()
    await page.locator('[data-testid="old-password"]').blur()
    await expect(page.locator('[data-testid="old-password-error"]')).toHaveText(
      '現在のパスワードを入力してください。'
    )
  })

  // No.46
  test('変更完了メッセージの文言が正確（loggedinモード）', async ({ page }) => {
    await mockChangePasswordSuccess(page)
    await page.fill('[data-testid="old-password"]', 'OldPassw0rd!')
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(page.locator('[data-testid="success-message"]')).toHaveText(
      '新しいパスワードへの変更が完了しました。'
    )
  })

  // No.47
  test('「メインに戻る」リンクのテキストが正確', async ({ page }) => {
    await expect(page.locator('[data-testid="back-to-main-link"]')).toHaveText('メインに戻る')
  })

  // No.48
  test('パスワード変更失敗メッセージの文言が正確（loggedinモード）', async ({ page }) => {
    await mockChangePasswordFailure(page)
    await page.fill('[data-testid="old-password"]', 'WrongOldPassw0rd!')
    await page.fill('[data-testid="new-password"]', 'NewPassw0rd!')
    await page.fill('[data-testid="new-password-confirm"]', 'NewPassw0rd!')
    await page.click('[data-testid="change-password-button"]')
    await expect(
      page.locator(
        'text=パスワード変更に失敗しました。旧パスワードをご確認のうえ、もう一度お試しください。'
      )
    ).toHaveText(
      'パスワード変更に失敗しました。旧パスワードをご確認のうえ、もう一度お試しください。'
    )
  })
})
