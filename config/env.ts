/**
 * 環境設定ファイル
 *
 * BASE_URL・認証情報などの外部設定値をここで一元管理します。
 * 実際の値は環境変数または .env ファイルで上書きしてください。
 *
 * 例（.env ファイル）:
 *   BASE_URL=https://staging.vtecx.com
 *   LOGIN_ACCOUNT_ID=admin@example.com
 *   LOGIN_PASSWORD=YourPassword1!
 *   SERVICE_NAME=your-service
 */
export const ENV = {
  /** テスト対象アプリのベースURL */
  BASE_URL: '',

  /** ログインに使用するアカウントID（メールアドレス） */
  LOGIN_ACCOUNT_ID: '',

  /** ログインに使用するパスワード */
  LOGIN_PASSWORD: '',

  /**
   * テスト対象のサービス名
   * service_name クエリパラメータやリダイレクトURLに使用します
   */
  SERVICE_NAME: ''
} as const
