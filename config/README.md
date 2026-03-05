# vtecx-adminpanel Playwright テスト

## ディレクトリ構成

```
.
├── playwright.config.ts       # Playwright 設定
├── config/
│   └── env.ts                 # ★ 環境設定（BASE_URL・認証情報など）
├── helpers/
│   └── auth.ts                # ★ ログイン共通関数 login()
└── tests/
    ├── login.spec.ts           # ログイン画面（認証不要）
    ├── signup.spec.ts          # 新規登録画面（認証不要）
    ├── forgot-password.spec.ts # パスワード再発行（認証不要）
    ├── change-password.spec.ts # パスワード変更（認証不要）
    ├── complete-registration.spec.ts # 本登録完了（認証不要）
    ├── service-management.spec.ts    # サービス管理（認証あり）
    ├── admin-basic.spec.ts           # 管理_基本情報（認証あり）
    ├── admin-log.spec.ts             # 管理_ログ（認証あり）
    ├── admin-endpoint.spec.ts        # 管理_EP（認証あり）
    ├── admin-schema.spec.ts          # 管理_スキーマ（認証あり）
    ├── admin-user.spec.ts            # 管理_ユーザー（認証あり）
    └── admin-others.spec.ts          # ログイン履歴/詳細設定/共通/リダイレクト
```

---

## 環境設定

`config/env.ts` に設定値が集約されています。
実際の環境に合わせて **環境変数** または **.env ファイル** で上書きしてください。

| 環境変数 | 説明 | デフォルト値 |
|---|---|---|
| `BASE_URL` | テスト対象アプリのURL | `http://localhost:3000` |
| `LOGIN_ACCOUNT_ID` | ログインに使うアカウントID | `admin@example.com` |
| `LOGIN_PASSWORD` | ログインに使うパスワード | `Passw0rd!` |
| `SERVICE_NAME` | テスト対象のサービス名 | `test-service` |

`.env` ファイルの例:
```
BASE_URL=https://staging.vtecx.com
LOGIN_ACCOUNT_ID=your-admin@example.com
LOGIN_PASSWORD=YourRealPassword1!
SERVICE_NAME=your-service-name
```

---

## ログイン共通関数 `login()`

`helpers/auth.ts` に定義されています。
**認証が必要なすべての spec ファイル** は `beforeEach` でこの関数を呼びます。

```typescript
import { login } from '../helpers/auth';

test.beforeEach(async ({ page }) => {
  // ① login.html でログイン → ② 指定 URL へ遷移
  await login(page, `${ENV.BASE_URL}/admin.html#/basic`);
});
```

### フロー
```
login() 呼び出し
  └─ login.html を開く
  └─ アカウントID・パスワードを入力（config/env.ts の値を使用）
  └─ ログインボタンをクリック
  └─ login.html から遷移したことを確認（認証完了）
  └─ afterLoginUrl が指定されていれば goto() で遷移
```

---

## セットアップ

```bash
# Playwright のインストール
npm install -D @playwright/test
npx playwright install

# ディレクトリ構成に合わせてファイルを配置
your-project/
├── playwright.config.ts
├── config/env.ts
├── helpers/auth.ts
└── tests/*.spec.ts
```

---

## 実行方法

```bash
# 全テスト実行
npx playwright test

# 特定ファイルのみ
npx playwright test tests/admin-schema.spec.ts

# テスト名で絞り込み
npx playwright test --grep "ドロップダウン"

# ブラウザを表示しながら実行（デバッグ用）
npx playwright test --headed

# UIモード
npx playwright test --ui

# レポートを開く
npx playwright show-report
```

環境変数を指定して実行する場合:
```bash
BASE_URL=https://staging.vtecx.com \
LOGIN_ACCOUNT_ID=admin@example.com \
LOGIN_PASSWORD=YourPassword1! \
npx playwright test
```

---

## data-testid の付与

テストコードは `data-testid` 属性でセレクターを指定しています。
HTMLコンポーネントに対応する属性を付与してください。

```html
<!-- ログインフォームの例 -->
<input data-testid="account-id" type="text" />
<input data-testid="password" type="password" />
<button data-testid="login-button">ログイン</button>
<p data-testid="error-message"></p>
```
