"""
Playwright テストケース → Google スプレッドシート 書き込みスクリプト

使い方:
  1. pip install google-auth google-auth-httplib2 google-api-python-client
  2. SERVICE_ACCOUNT_FILE と SPREADSHEET_ID を書き換える
  3. python upload_to_sheets.py
"""

import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

# ===================== 設定（ここを書き換えてください） =====================
SERVICE_ACCOUNT_FILE = ""   # ダウンロードしたJSONキーのパス
SPREADSHEET_ID = ""          # スプレッドシートURLの /d/【ここ】/edit
# =========================================================================

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# ---------- 色定義（RGB 0-1 スケール） ----------
def rgb(r, g, b):
    return {"red": r / 255, "green": g / 255, "blue": b / 255}

HEADER_BG   = rgb(31, 78, 121)    # 濃い青
HEADER_FG   = rgb(255, 255, 255)  # 白
CATEGORY_BG = rgb(189, 215, 238)  # 薄い青
CATEGORY_FG = rgb(31, 78, 121)
ALT_BG      = rgb(242, 242, 242)  # 薄いグレー
WHITE       = rgb(255, 255, 255)

# ---------- テストケースデータ ----------
HEADERS = ["No", "カテゴリ", "テストケース名", "前提条件", "操作手順", "期待結果", "優先度", "自動化"]
COL_WIDTHS_PX = [50, 150, 320, 230, 360, 360, 80, 80]  # ピクセル単位

SHEETS_DATA = {
    "1_ログイン": [
        # ── E2E テスト ──
        [1, "正常系", "正常ログイン（indexへ遷移）",
         "未ログイン状態\nログイン画面を開いている\n/d/?_login をモック（200応答）",
         "1. アカウントIDを入力する\n2. パスワードを入力する\n3. ログインボタンを押す",
         "index.html にリダイレクトされる", "高", "○"],
        [2, "正常系", "クエリパラメータ付きログイン（redirectへ遷移）",
         "URLに ?service_name=xxx が付いている\n実APIに接続できる状態",
         "1. アカウントID・パスワードを入力する\n2. ログインボタンを押す",
         "redirect.html?service_name=xxx にリダイレクトされる", "高", "○"],
        [3, "バリデーション", "アカウントIDが空の場合はボタンは押せるがリクエストが飛ばない",
         "ログイン画面を開いている",
         "1. アカウントIDを空のまま\n2. パスワードを入力する\n3. ログインボタンを押す",
         "APIリクエストが発生しない", "中", "○"],
        [4, "バリデーション", "パスワードが空の場合はボタンは押せるがリクエストが飛ばない",
         "ログイン画面を開いている",
         "1. アカウントIDを入力する\n2. パスワードを空のまま\n3. ログインボタンを押す",
         "APIリクエストが発生しない", "中", "○"],
        [5, "エラー系", "誤認証でエラーメッセージ表示",
         "ログイン画面を開いている\n/d/?_login をモック（401応答）",
         "1. 誤ったアカウントID・パスワードを入力する\n2. ログインボタンを押す",
         "「ログインに失敗しました。メールアドレスまたはパスワードに誤りがあります。」が表示される", "高", "○"],
        [6, "エラー系", "Captcha required 時に次回はreCAPTCHA実行",
         "ログイン画面を開いている\n/d/?_login をモック（401 + feed.title: Captcha required at next login.）",
         "1. ログインを試みてサーバーから Captcha required を受け取る\n2. 再度ログインボタンを押す",
         "2回目のリクエストURLに g-recaptcha-token が付与される", "中", "○"],
        [7, "ナビゲーション", "パスワード再発行リンクで遷移",
         "ログイン画面を開いている",
         "1. 「パスワードをお忘れの方はこちら」をクリックする",
         "forgot_password.html に遷移する", "中", "○"],
        [8, "ナビゲーション", "アカウント登録リンクで遷移",
         "ログイン画面を開いている",
         "1. 「アカウント登録」をクリックする",
         "signup.html に遷移する", "中", "○"],
        # ── 単体テスト ──
        [9, "単体", "両方入力済みでログインボタンを押すとAPIリクエストが発生する",
         "ログイン画面を開いている\n/d/?_login をモック（200応答）",
         "1. アカウントIDを入力する\n2. パスワードを入力する\n3. ログインボタンを押す",
         "/d/?_login へのAPIリクエストが発生する", "高", "○"],
        [10, "単体", "アカウントIDのみ入力でボタンを押してもAPIリクエストが発生しない",
         "ログイン画面を開いている",
         "1. アカウントIDのみ入力する\n2. ログインボタンを押す",
         "APIリクエストが発生しない", "中", "○"],
        [11, "単体", "パスワードのみ入力でボタンを押してもAPIリクエストが発生しない",
         "ログイン画面を開いている",
         "1. パスワードのみ入力する\n2. ログインボタンを押す",
         "APIリクエストが発生しない", "中", "○"],
        [12, "単体", "認証失敗メッセージの文言が正確",
         "ログイン画面を開いている\n/d/?_login をモック（401応答）",
         "1. 誤ったアカウントID・パスワードを入力する\n2. ログインボタンを押す",
         "エラーメッセージが「ログインに失敗しました。メールアドレスまたはパスワードに誤りがあります。」と完全一致する", "高", "○"],
    ],
    "2_新規登録": [
        # ── E2E テスト ──
        [1, "正常系", "仮登録成功でステッパーが進む",
         "signup.html を開いている\nreCAPTCHA モック済み\n/d/?_adduser をモック（200応答）",
         "1. メールアドレスを入力する\n2. 有効なパスワードを入力する\n3. 確認パスワードを入力する\n4. 利用規約にチェックする\n5. 仮登録ボタンを押す",
         "完了メッセージが表示される", "高", "○"],
        [2, "バリデーション", "不正なメールアドレスでエラー表示",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 「abc」など形式不正のメールアドレスを入力する\n2. フォーカスを外す",
         "メールアドレスエラーメッセージが表示される", "高", "○"],
        [3, "バリデーション", "パスワードがルール不満でエラー表示",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 「password」など記号なしのパスワードを入力する\n2. フォーカスを外す",
         "パスワードのヒント文言が赤色（rgb(211, 47, 47)）になる", "高", "○"],
        [4, "バリデーション", "確認パスワード不一致でエラー表示",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. パスワードを入力する\n2. 確認欄に異なるパスワードを入力する\n3. フォーカスを外す",
         "確認パスワードエラーメッセージが表示される", "高", "○"],
        [5, "バリデーション", "未入力・未チェック時に登録ボタンが非活性",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 何も入力せず画面を開いた状態を確認する",
         "仮登録ボタンが disabled 状態のまま", "高", "○"],
        [6, "エラー系", "重複アカウントでエラーメッセージ表示",
         "signup.html を開いている\nreCAPTCHA モック済み\n/d/?_adduser をモック（409応答・Duplicated key）",
         "1. 正しい形式でメールアドレス・パスワードを入力する\n2. 利用規約にチェックする\n3. 仮登録ボタンを押す",
         "「そのアカウントは既に登録済みです。」が表示される", "高", "○"],
        [7, "エラー系", "メール設定未実施エラーメッセージ表示",
         "signup.html を開いている\nreCAPTCHA モック済み\n/d/?_adduser をモック（400応答・Mail setting is required）",
         "1. 正しい形式でメールアドレス・パスワードを入力する\n2. 利用規約にチェックする\n3. 仮登録ボタンを押す",
         "「アカウント登録を実行するには事前にメール設定をする必要があります。」が表示される", "中", "○"],
        [8, "ナビゲーション", "ログインに戻るリンクで遷移",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 「ログインに戻る」をクリックする",
         "login.html に遷移する", "中", "○"],
        [9, "ナビゲーション", "利用規約リンクで遷移",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 「利用規約」をクリックする",
         "同一タブで user_terms.html に遷移する", "低", "○"],
        # ── 単体テスト ──
        [10, "単体", "全項目有効で仮登録ボタンが活性になる",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 有効なメールアドレスを入力する\n2. 有効なパスワードを入力する\n3. 確認パスワードを同じ値で入力する\n4. 利用規約にチェックする",
         "仮登録ボタンが enabled 状態になる", "高", "○"],
        [11, "単体", "利用規約未チェックで仮登録ボタンが非活性のまま",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 有効なメールアドレスを入力する\n2. 有効なパスワードを入力する\n3. 確認パスワードを同じ値で入力する\n4. 利用規約はチェックしない",
         "仮登録ボタンが disabled 状態のまま", "高", "○"],
        [12, "単体", "パスワード不一致で仮登録ボタンが非活性のまま",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 有効なメールアドレスを入力する\n2. 有効なパスワードを入力する\n3. 確認パスワードに異なる値を入力する\n4. 利用規約にチェックする",
         "仮登録ボタンが disabled 状態のまま", "高", "○"],
        [13, "単体", "メール形式チェック：@なし → エラー表示",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 「userexample.com」を入力する\n2. フォーカスを外す",
         "メールアドレスエラーメッセージが表示される", "中", "○"],
        [14, "単体", "メール形式チェック：正常形式 → エラー非表示",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 「user@example.com」を入力する\n2. フォーカスを外す",
         "メールアドレスエラーメッセージが表示されない", "中", "○"],
        [15, "単体", "パスワード：記号なし → エラー表示",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 「Password1」を入力する\n2. フォーカスを外す",
         "パスワードのヒント文言が赤色（rgb(211, 47, 47)）になる", "中", "○"],
        [16, "単体", "パスワード：英大文字+小文字+数字+記号8文字以上 → エラーなし",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 「Passw0rd!」を入力する\n2. フォーカスを外す",
         "パスワードのヒント文言が赤色にならない", "中", "○"],
        [17, "単体", "パスワード：7文字以下 → エラー表示",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 「Pass0!」を入力する\n2. フォーカスを外す",
         "パスワードのヒント文言が赤色（rgb(211, 47, 47)）になる", "中", "○"],
        [18, "単体", "パスワード：数字なし → エラー表示",
         "signup.html を開いている\nreCAPTCHA モック済み",
         "1. 「Password!」を入力する\n2. フォーカスを外す",
         "パスワードのヒント文言が赤色（rgb(211, 47, 47)）になる", "中", "○"],
        [19, "単体", "重複アカウントエラーの文言が正確",
         "signup.html を開いている\nreCAPTCHA モック済み\n/d/?_adduser をモック（409応答・Duplicated key）",
         "1. 正しい形式でメールアドレス・パスワードを入力する\n2. 利用規約にチェックする\n3. 仮登録ボタンを押す",
         "エラーメッセージが「そのアカウントは既に登録済みです。」と完全一致する", "高", "○"],
        [20, "単体", "メール設定未実施エラーの文言が正確",
         "signup.html を開いている\nreCAPTCHA モック済み\n/d/?_adduser をモック（400応答・Mail setting is required）",
         "1. 正しい形式でメールアドレス・パスワードを入力する\n2. 利用規約にチェックする\n3. 仮登録ボタンを押す",
         "エラーメッセージが「アカウント登録を実行するには事前にメール設定をする必要があります。」と完全一致する", "高", "○"],
    ],
    "3_パスワード再発行": [
        # ── E2E テスト ──
        [1, "正常系", "メール送信成功でステッパーが進む",
         "forgot_password.html を開いている\nreCAPTCHA モック済み\n/d/?_passreset をモック（200応答）",
         "1. 有効なメールアドレスを入力する\n2. メール送信ボタンを押す",
         "送信完了メッセージが表示される", "高", "○"],
        [2, "バリデーション", "不正メールアドレスで送信ボタンが非活性",
         "forgot_password.html を開いている\nreCAPTCHA モック済み",
         "1. 「abc」など形式不正の文字列を入力する",
         "メール送信ボタンが disabled 状態のまま", "高", "○"],
        [3, "バリデーション", "空欄時に送信ボタンが非活性",
         "forgot_password.html を開いている\nreCAPTCHA モック済み",
         "1. メールアドレスを入力しない",
         "メール送信ボタンが disabled 状態のまま", "高", "○"],
        [4, "エラー系", "送信失敗でエラーメッセージ表示",
         "forgot_password.html を開いている\nreCAPTCHA モック済み\n/d/?_passreset をモック（500応答）",
         "1. 有効なメールアドレスを入力する\n2. メール送信ボタンを押す",
         "「メールの送信に失敗しました。画面をリロードしてもう一度実行してください。」が表示される", "高", "○"],
        [5, "ナビゲーション", "ログインに戻るリンクで遷移",
         "forgot_password.html を開いている\nreCAPTCHA モック済み",
         "1. 「ログインに戻る」をクリックする",
         "login.html に遷移する", "中", "○"],
        # ── 単体テスト ──
        [6, "単体", "メール形式チェック：@なし → 送信ボタン非活性",
         "forgot_password.html を開いている\nreCAPTCHA モック済み",
         "1. 「userexample.com」を入力する",
         "メール送信ボタンが disabled 状態のまま", "中", "○"],
        [7, "単体", "メール形式チェック：空文字 → 送信ボタン非活性",
         "forgot_password.html を開いている\nreCAPTCHA モック済み",
         "1. メールアドレスを入力しない",
         "メール送信ボタンが disabled 状態のまま", "中", "○"],
        [8, "単体", "メール形式チェック：サブドメインあり → 送信ボタン活性",
         "forgot_password.html を開いている\nreCAPTCHA モック済み",
         "1. 「user@mail.example.co.jp」を入力する",
         "メール送信ボタンが enabled 状態になる", "中", "○"],
        [9, "単体", "メール送信失敗メッセージの文言が正確",
         "forgot_password.html を開いている\nreCAPTCHA モック済み\n/d/?_passreset をモック（500応答）",
         "1. 有効なメールアドレスを入力する\n2. メール送信ボタンを押す",
         "エラーメッセージが「メールの送信に失敗しました。画面をリロードしてもう一度実行してください。」と完全一致する", "高", "○"],
    ],
    "4_パスワード変更": [
        [1, "認証", "有効なURLでフォームが表示される",
         "有効な _RXID と _passreset_token を含むURL\nAPIが正常応答するようモック",
         "1. change_password.html#/?_RXID=xxx&_passreset_token=yyy にアクセスする",
         "パスワード入力フォームが表示される（authStatus: ok）", "高", "○"],
        [2, "認証", "無効なURLでエラーメッセージ表示",
         "トークンなしのURL",
         "1. change_password.html にトークンなしでアクセスする",
         "「このリンクは無効か、有効期限が切れています。」が表示される", "高", "○"],
        [3, "認証", "ページロード中に検証中メッセージ表示",
         "APIレスポンスを遅延させる設定",
         "1. 有効なURLにアクセスする\n2. APIレスポンス前の状態を確認する",
         "「リンクを検証しています…」が表示される", "低", "△"],
        [4, "認証", "RXID使用済みでもトークンがあれば続行",
         "APIが401 + 'RXID has been used more than once.' を返すようモック",
         "1. 有効なトークン付きURLでアクセスする\n2. APIが401エラーを返す",
         "エラーにならずパスワード入力フォームが表示される", "中", "○"],
        [5, "正常系", "有効なパスワードで変更完了メッセージ表示",
         "有効なURLでフォームが表示されている\nAPIが正常応答するようモック",
         "1. ルールを満たすパスワードを入力する\n2. 確認パスワードに同じ値を入力する\n3. 変更ボタンを押す",
         "「新しいパスワードへの変更が完了しました。」が表示される", "高", "○"],
        [6, "バリデーション", "ルール不満のパスワードでエラー表示",
         "フォームが表示されている",
         "1. 「pass」など短いパスワードを入力する\n2. フォーカスを外す",
         "パスワード欄がエラー表示になる", "高", "○"],
        [7, "バリデーション", "確認パスワード不一致でエラー表示",
         "フォームが表示されている",
         "1. パスワードを入力する\n2. 確認欄に異なる値を入力する\n3. フォーカスを外す",
         "確認パスワード欄がエラー表示になる", "高", "○"],
        [8, "バリデーション", "不正入力時に変更ボタンが非活性",
         "フォームが表示されている",
         "1. パスワードまたは確認パスワードが不正な状態にする",
         "「パスワードを変更する」ボタンが disabled 状態のまま", "高", "○"],
        [9, "ナビゲーション", "ログインに戻るリンクで遷移",
         "change_password.html を開いている",
         "1. 「ログインに戻る」をクリックする",
         "login.html に遷移する", "中", "○"],
    ],
    "5_本登録完了": [
        # ── E2E テスト ──
        [1, "E2E", "完了メッセージが表示される",
         "ログイン済み\ncomplete_registration.html を開いている",
         "1. ページを開く",
         "「本登録が完了しました。」が表示される", "高", "○"],
        [2, "E2E", "ログインに戻るリンクで遷移",
         "ログイン済み\ncomplete_registration.html を開いている",
         "1. 「ログインに戻る」をクリックする",
         "login.html に遷移する", "中", "○"],
        # ── 単体テスト ──
        [3, "単体", "完了メッセージの文言が正確",
         "ログイン済み\ncomplete_registration.html を開いている",
         "1. ページを開く",
         "完了メッセージが「本登録が完了しました。」と完全一致する", "高", "○"],
        [4, "単体", "未ログイン状態でアクセスするとログイン画面へリダイレクト",
         "未ログイン状態（Cookie削除済み）",
         "1. complete_registration.html に直接アクセスする",
         "login.html にリダイレクトされる", "高", "○"],
    ],
    "6_サービス管理": [
        # ── E2E テスト ──
        [1, "E2E", "サービス一覧が表示される",
         "ログイン済み\nサービス一覧をモック（MOCK_ENTRIES）",
         "1. mockServiceList を登録する\n2. page.reload() する",
         "service-table が表示される", "高", "○"],
        [2, "E2E", "サービス0件時にアラート表示",
         "ログイン済み\nサービス0件をモック",
         "1. mockServiceListEmpty を登録する\n2. page.reload() する",
         "no-service-alert に「サービスを作成してください。」が表示される", "高", "○"],
        [3, "E2E", "Proは緑ChipでFreeはアウトライン表示",
         "ログイン済み\nproduction/free 混在のサービスをモック",
         "1. mockServiceList を登録する\n2. page.reload() する",
         "plan-chip-pro-service が MuiChip-colorSuccess クラスを持つ\nplan-chip-free-service が MuiChip-outlined クラスを持つ", "中", "○"],
        [4, "E2E", "未ログイン時はlogin.htmlにリダイレクト",
         "未ログイン状態（login() を呼ばずに直接アクセス）",
         "1. page.goto(index.html) する",
         "login.html にリダイレクトされる", "高", "○"],
        [5, "E2E", "「新規作成」ボタンでモーダルが開く",
         "ログイン済み",
         "1. create-service-button をクリックする",
         "create-service-modal が表示される", "高", "○"],
        [6, "E2E", "不正なサービス名でエラーメッセージ表示",
         "ログイン済み\n新規作成モーダルが開いている",
         "1. service-name-input に「My_Service」を入力する",
         "service-name-error が表示される\ncreate-confirm-button が非活性", "高", "○"],
        [7, "E2E", "有効なサービス名で作成成功メッセージ表示",
         "ログイン済み\nmockServiceCreateSuccess を登録済み\n新規作成モーダルが開いている",
         "1. service-name-input に「new-service」を入力しblurする\n2. create-confirm-button をクリックする",
         "「サービス作成を作成しました。」の Alert が表示される", "高", "○"],
        [8, "E2E", "キャンセルでモーダルが閉じる",
         "ログイン済み\n新規作成モーダルが開いている",
         "1. create-cancel-button をクリックする",
         "create-service-modal が非表示になる", "中", "○"],
        [9, "E2E", "削除ボタンで確認ダイアログが開く",
         "ログイン済み\nサービス一覧をモック",
         "1. mockServiceList を登録してリロードする\n2. delete-service-pro-service をクリックする",
         "delete-confirm-dialog が表示される", "高", "○"],
        [10, "E2E", "OKで削除リクエストが200完了後にサービス一覧が再取得される",
         "ログイン済み\nmockServiceList・mockServiceDeleteSuccess を登録済み",
         "1. page.reload() する\n2. delete-service-pro-service をクリックする\n3. delete-confirm-ok をクリックする",
         "「〇〇の削除しました。」の Alert が表示される\nservice-table が引き続き表示される", "高", "○"],
        [11, "E2E", "キャンセルで削除がキャンセルされる",
         "ログイン済み\nサービス一覧をモック",
         "1. delete-service-pro-service をクリックする\n2. delete-confirm-cancel をクリックする",
         "delete-confirm-dialog が閉じる\nservice-row-pro-service が表示されたまま", "中", "○"],
        [12, "E2E", "管理画面ボタンでredirect.htmlに遷移",
         "ログイン済み\nサービス一覧をモック",
         "1. admin-link-pro-service をクリックする",
         "redirect.html?service_name=pro-service に遷移する", "中", "○"],
        [13, "E2E", "ログアウトでlogin.htmlに遷移",
         "ログイン済み",
         "1. account-icon をクリックする\n2. logout-button をクリックする",
         "login.html に遷移する", "高", "○"],
        # ── 単体テスト ──
        [14, "単体", "有効なサービス名入力で作成ボタンが活性",
         "ログイン済み\nサービス一覧をモック\n新規作成モーダルが開いている",
         "1. service-name-input に「my-service-01」を入力しblurする",
         "create-confirm-button が活性になる", "高", "○"],
        [15, "単体", "不正なサービス名で作成ボタンが非活性",
         "ログイン済み\nサービス一覧をモック\n新規作成モーダルが開いている",
         "1. service-name-input に「My_Service」を入力する",
         "create-confirm-button が非活性のまま", "高", "○"],
        [16, "単体", "空欄で作成ボタンが非活性",
         "ログイン済み\nサービス一覧をモック\n新規作成モーダルが開いている",
         "1. 何も入力しない",
         "create-confirm-button が非活性", "高", "○"],
        [17, "単体", "サービス名：英小文字+数字+ハイフン → エラーなし",
         "ログイン済み\nサービス一覧をモック\n新規作成モーダルが開いている",
         "1. service-name-input に「my-service-01」を入力する",
         "service-name-error が表示されない", "中", "○"],
        [18, "単体", "サービス名：大文字含む → エラー表示",
         "ログイン済み\nサービス一覧をモック\n新規作成モーダルが開いている",
         "1. service-name-input に「My_Service」を入力する",
         "service-name-error が表示される", "中", "○"],
        [19, "単体", "productionプランは緑色Chipで表示",
         "ログイン済み\nサービス一覧をモック\n新規作成モーダルが開いている",
         "1. create-cancel-button をクリックする",
         "plan-chip-pro-service が MuiChip-colorSuccess クラスを持つ", "中", "○"],
        [20, "単体", "freeプランはアウトラインChipで表示",
         "ログイン済み\nサービス一覧をモック\n新規作成モーダルが開いている",
         "1. create-cancel-button をクリックする",
         "plan-chip-free-service が MuiChip-outlined クラスを持つ", "中", "○"],
    ],
    "7a_管理_基本情報": [
        [1, "表示確認", "サービス名・APIKEY・アクセストークンが表示される",
         "admin.html にログイン済み\nAPIが各値を返すようモック",
         "1. admin.html#/basic にアクセスする",
         "サービス名・APIKEY・アクセストークンがそれぞれ表示される", "高", "○"],
        [2, "操作", "アクセストークン更新ダイアログが開く", "基本情報ページを開いている",
         "1. 「アクセストークンの更新」ボタンをクリックする", "確認ダイアログが表示される", "高", "○"],
        [3, "操作", "OKでトークン更新され成功メッセージ表示",
         "確認ダイアログが開いている\nAPIが成功応答するようモック",
         "1. 確認ダイアログの「OK」をクリックする",
         "「アクセストークンの更新を行いました。」が表示される", "高", "○"],
        [4, "操作", "APIKEYの更新ダイアログが開く", "基本情報ページを開いている",
         "1. 「APIKEYの更新」ボタンをクリックする", "確認ダイアログが表示される", "高", "○"],
        [5, "操作", "コピーボタンでスナックバーが表示される", "基本情報ページを開いている",
         "1. APIKEY横のコピーボタンをクリックする", "「コピーしました。」スナックバーが表示される", "中", "○"],
    ],
    "7b_管理_ログ": [
        [1, "表示確認", "ログ一覧がテーブルに表示される",
         "admin.html にログイン済み\nAPIがログ一覧を返すようモック",
         "1. admin.html#/log にアクセスする",
         "日時・レベル・コンポーネント・内容・詳細のカラムでログが表示される", "高", "○"],
        [2, "表示確認", "ERRORレベルの行は赤背景で表示される",
         "ERROR レベルのログが含まれるAPIモック",
         "1. ログページを開く", "ERROR レベルの行が赤背景で表示される", "中", "○"],
        [3, "ページネーション", "1ページ目では「前へ」が非活性", "ログページを開いている",
         "1. ページネーションの「前へ」矢印を確認する", "「前へ」矢印が disabled 状態", "中", "○"],
        [4, "ページネーション", "「次へ」でページが進む", "ログが50件以上あるAPIモック",
         "1. 「次へ」矢印をクリックする", "次のページのログが表示される", "中", "○"],
        [5, "操作", "リフレッシュでデータが再取得される", "ログページを開いている",
         "1. リフレッシュボタンをクリックする", "APIが再度呼ばれログが更新される", "低", "○"],
    ],
    "7c_管理_EP": [
        [1, "表示確認", "エンドポイント一覧が表示される",
         "admin.html にログイン済み\nAPIがエンドポイント一覧を返すようモック",
         "1. admin.html#/endpoint にアクセスする",
         "エンドポイント名・説明・権限のカラムが表示される", "高", "○"],
        [2, "表示確認", "/_始まりはグレー背景で編集削除ボタン非表示",
         "/_settings などシステムEPが含まれるAPIモック",
         "1. エンドポイント一覧を確認する",
         "/_で始まる行はグレー背景で、編集・削除ボタンが表示されない", "中", "○"],
        [3, "新規作成", "「追加」ボタンでモーダルが開く", "エンドポイントページを開いている",
         "1. 「追加」ボタンをクリックする", "エンドポイント新規作成モーダルが表示される", "高", "○"],
        [4, "新規作成", "数字始まりでエラーメッセージ表示", "モーダルが開いている",
         "1. 「1endpoint」など数字始まりの名前を入力する",
         "「エンドポイント名は半角英字から開始してください。」が表示される", "高", "○"],
        [5, "新規作成", "有効な名前で作成成功",
         "モーダルが開いている\nAPIが成功応答するようモック",
         "1. 有効なエンドポイント名を入力する\n2. 「新規作成」ボタンを押す",
         "成功メッセージが表示されリストが更新される", "高", "○"],
        [6, "編集", "編集ボタンでモーダルが開き既存値が入力済み", "エンドポイント一覧が表示されている",
         "1. ユーザー作成EPの「編集」ボタンをクリックする",
         "モーダルが開き、エンドポイント名フィールドが disabled で既存値が表示される", "高", "○"],
        [7, "削除", "削除ボタンで確認ダイアログが開く", "エンドポイント一覧が表示されている",
         "1. ユーザー作成EPの「削除」ボタンをクリックする", "削除確認ダイアログが表示される", "高", "○"],
        [8, "削除", "OKで削除が実行される",
         "削除確認ダイアログが開いている\nAPIが成功応答するようモック",
         "1. 「OK」をクリックする", "削除成功メッセージが表示されリストから消える", "高", "○"],
    ],
    "7d_管理_スキーマ": [
        [1, "表示確認", "スキーマ一覧がテーブルに表示される",
         "admin.html にログイン済み\nAPIがスキーマを返すようモック",
         "1. admin.html#/schema にアクセスする",
         "和名・項目名・型・検索index・全文検索のカラムが表示される", "高", "○"],
        [2, "表示確認", "子を持つ行は緑背景で表示される",
         "親子関係のあるスキーマのAPIモック",
         "1. スキーマ一覧を確認する", "子を持つ行が緑背景で表示される", "中", "○"],
        [3, "新規追加", "「追加」ボタンでモーダルが開く", "スキーマページを開いている",
         "1. 「追加」ボタンをクリックする", "スキーマ追加モーダルが表示される", "高", "○"],
        [4, "新規追加", "数字始まり項目名でエラー表示", "モーダルが開いている",
         "1. 「1name」など数字始まりの項目名を入力する",
         "「項目名は半角英字から開始してください。」が表示される", "高", "○"],
        [5, "新規追加", "検索インデックスをEnterで追加できる", "モーダルが開いている",
         "1. 検索インデックス欄に「name」と入力しEnterを押す", "「name」のChipが表示される", "中", "○"],
        [6, "新規追加", "型のドロップダウンで各型を選択できる", "モーダルが開いている",
         "1. 型ドロップダウンを開く", "String, Integer, Date, Boolean 等の選択肢が表示される", "中", "○"],
        [7, "新規追加", "有効な入力で保存成功",
         "モーダルが開いている\nAPIが成功応答するようモック",
         "1. 有効な項目名を入力する\n2. 「保存」ボタンを押す",
         "成功メッセージが表示されリストが更新される", "高", "○"],
        [8, "編集", "編集アイコンでモーダルが開き既存値が設定される", "スキーマ一覧が表示されている",
         "1. スキーマ行の編集アイコンをクリックする",
         "モーダルが開き既存のスキーマ情報が入力された状態になる", "高", "○"],
        [9, "子要素追加", "＋アイコンで子追加モーダルが開き親パス自動設定",
         "スキーマ一覧が表示されている（親行あり）",
         "1. 親スキーマ行の「＋」アイコンをクリックする",
         "モーダルが開き親パスが自動入力された状態になる", "高", "○"],
    ],
    "7e_管理_ユーザー": [
        [1, "表示確認", "ユーザー一覧がテーブルに表示される",
         "admin.html にログイン済み\nAPIがユーザー一覧を返すようモック",
         "1. admin.html#/users にアクセスする",
         "ACL権限・UID・アカウント・状態・登録日のカラムが表示される", "高", "○"],
        [2, "表示確認", "管理者ユーザーは「管理者」と緑色で表示",
         "管理者グループにユーザーが含まれるAPIモック",
         "1. ユーザー一覧を確認する", "管理者ユーザーが「管理者」（緑色テキスト）で表示される", "中", "○"],
        [3, "表示確認", "Activated は緑Chip、Revoked はデフォルトChip",
         "ステータスが混在するユーザーリストのAPIモック",
         "1. ユーザー一覧を確認する",
         "Activatedは緑色Chip、Revokedはデフォルト色Chipで表示される", "中", "○"],
        [4, "ステータス変更", "▼ボタンでステータス変更モーダルが開く", "ユーザー一覧が表示されている",
         "1. ユーザー行のChipの「▼」ボタンをクリックする", "ステータス変更モーダルが表示される", "高", "○"],
        [5, "ステータス変更", "Activatedユーザーには削除と無効の選択肢",
         "モーダルが開いている（Activatedユーザー選択済み）",
         "1. Activatedユーザーのモーダルを開く", "「削除」「無効」のラジオボタンが表示される", "高", "○"],
        [6, "ステータス変更", "Revokedユーザーには削除と有効の選択肢",
         "モーダルが開いている（Revokedユーザー選択済み）",
         "1. Revokedユーザーのモーダルを開く", "「削除」「有効」のラジオボタンが表示される", "高", "○"],
        [7, "ステータス変更", "「無効」選択で確認アラートが表示される",
         "Activatedユーザーのモーダルが開いている",
         "1. 「無効」ラジオボタンを選択する", "「このアカウントを無効にし…」の警告アラートが表示される", "中", "○"],
        [8, "ステータス変更", "「適用」でステータスが変更され成功メッセージ",
         "モーダルでステータスを選択済み\nAPIが成功応答するようモック",
         "1. 「適用」ボタンをクリックする",
         "「ステータスを更新しました。」が表示されリストが更新される", "高", "○"],
        [9, "ページネーション", "ページネーションが機能する", "ユーザーが50件以上いるAPIモック",
         "1. 「次へ」矢印をクリックする", "次のページのユーザーが表示される", "中", "○"],
    ],
    "7f_管理_ログイン履歴": [
        [1, "表示確認", "ログイン履歴がテーブルに表示される",
         "admin.html にログイン済み\nAPIが履歴を返すようモック",
         "1. admin.html#/login_history にアクセスする",
         "日時・区分/IP・UID/アカウント・UserAgent/詳細のカラムが表示される", "高", "○"],
        [2, "ページネーション", "ページネーションが機能する", "履歴が50件以上あるAPIモック",
         "1. 「次へ」矢印をクリックする", "次のページの履歴が表示される", "中", "○"],
        [3, "操作", "リフレッシュでデータが再取得される", "ログイン履歴ページを開いている",
         "1. リフレッシュボタンをクリックする", "APIが再度呼ばれ履歴が更新される", "低", "○"],
    ],
    "7g_管理_詳細設定": [
        [1, "表示確認", "プロパティ一覧がテーブルに表示される",
         "admin.html にログイン済み\nAPIがプロパティを返すようモック",
         "1. admin.html#/properties にアクセスする",
         "キー・値のカラムでプロパティ一覧が表示される", "高", "○"],
        [2, "表示確認", "登録メール本文がモノスペースで表示される",
         "APIがメール本文を返すようモック",
         "1. 詳細設定ページを開く", "登録メール本文がモノスペースフォントで表示される", "中", "○"],
        [3, "表示確認", "パスワード変更メール本文が表示される",
         "APIがメール本文を返すようモック",
         "1. 詳細設定ページを開く", "パスワード変更メール本文が表示される", "中", "○"],
    ],
    "7h_管理_共通": [
        [1, "ナビゲーション", "サイドバー「基本情報」で/basicに遷移", "admin.html を開いている",
         "1. サイドバーの「基本情報」をクリックする", "admin.html#/basic に遷移する", "高", "○"],
        [2, "ナビゲーション", "サイドバー「ログ」で/logに遷移", "admin.html を開いている",
         "1. サイドバーの「ログ」をクリックする", "admin.html#/log に遷移する", "高", "○"],
        [3, "ナビゲーション", "サイドバー「エンドポイント管理」で遷移", "admin.html を開いている",
         "1. サイドバーの「エンドポイント管理」をクリックする",
         "admin.html#/endpoint に遷移する", "高", "○"],
        [4, "ナビゲーション", "サイドバー「スキーマ管理」で遷移", "admin.html を開いている",
         "1. サイドバーの「スキーマ管理」をクリックする", "admin.html#/schema に遷移する", "高", "○"],
        [5, "ナビゲーション", "サイドバー「ユーザ管理」で遷移", "admin.html を開いている",
         "1. サイドバーの「ユーザ管理」をクリックする", "admin.html#/users に遷移する", "高", "○"],
        [6, "ナビゲーション", "サイドバー「ログイン履歴」で遷移", "admin.html を開いている",
         "1. サイドバーの「ログイン履歴」をクリックする",
         "admin.html#/login_history に遷移する", "高", "○"],
        [7, "ナビゲーション", "サイドバー「詳細設定」で遷移", "admin.html を開いている",
         "1. サイドバーの「詳細設定」をクリックする", "admin.html#/properties に遷移する", "高", "○"],
        [8, "レスポンシブ", "モバイル幅でサイドバーがドロワーに切り替わる", "ビューポートを375pxに設定",
         "1. admin.html をモバイル幅で開く",
         "サイドバーが非表示になりハンバーガーアイコンが表示される", "中", "○"],
        [9, "レスポンシブ", "ハンバーガーアイコンでドロワーが開閉する",
         "モバイル幅で admin.html を開いている",
         "1. ハンバーガーアイコンをクリックする",
         "ドロワーが開く\n再度クリックすると閉じる", "中", "○"],
        [10, "ナビゲーション", "ログアウトでlogin.htmlにリダイレクト", "admin.html を開いている",
         "1. アカウントアイコンをクリックする\n2. 「ログアウト」をクリックする",
         "https://admin.vte.cx/login.html?service_name=xxx にリダイレクトされる", "高", "○"],
    ],
    "8_リダイレクト": [
        [1, "正常系", "service_name付きURLでadmin.htmlにリダイレクト",
         "redirect.html にアクセスできる状態",
         "1. redirect.html?service_name=myservice にアクセスする",
         "/d/@/admin.html?_login=myservice にリダイレクトされる", "高", "○"],
        [2, "異常系", "クエリパラメータなしでリダイレクトしない",
         "redirect.html にアクセスできる状態",
         "1. redirect.html にクエリパラメータなしでアクセスする",
         "リダイレクトが発生しない（URLが変わらない）", "中", "○"],
    ],
}

# ---------- ヘルパー関数 ----------

def cell_format(bg_color=None, fg_color=None, bold=False, font_size=10,
                h_align="LEFT", wrap=True):
    fmt = {
        "textFormat": {
            "bold": bold,
            "fontSize": font_size,
            "fontFamily": "Arial",
        },
        "horizontalAlignment": h_align,
        "verticalAlignment": "MIDDLE",
        "wrapStrategy": "WRAP" if wrap else "OVERFLOW_CELL",
    }
    if bg_color:
        fmt["backgroundColor"] = bg_color
    if fg_color:
        fmt["textFormat"]["foregroundColor"] = fg_color
    return fmt


def make_cell(value, bg=None, fg=None, bold=False, h_align="LEFT"):
    cell = {
        "userEnteredValue": {"stringValue": str(value) if value is not None else ""},
        "userEnteredFormat": cell_format(bg, fg, bold, h_align=h_align),
    }
    return cell


def build_rows(cases):
    """ヘッダー行 + データ行のリストを返す"""
    rows = []

    # ヘッダー行
    header_cells = []
    for i, h in enumerate(HEADERS):
        align = "CENTER" if i in (0, 6, 7) else "LEFT"
        header_cells.append(make_cell(h, bg=HEADER_BG, fg=HEADER_FG, bold=True, h_align=align))
    rows.append({"values": header_cells})

    # データ行
    for idx, case in enumerate(cases):
        alt = (idx % 2 == 1)
        row_bg = ALT_BG if alt else WHITE
        cells = []
        for col_i, val in enumerate(case):
            align = "CENTER" if col_i in (0, 6, 7) else "LEFT"
            cells.append(make_cell(val, bg=row_bg, h_align=align))
        rows.append({"values": cells})

    return rows


def col_width_req(sheet_id, col_index, width_px):
    return {
        "updateDimensionProperties": {
            "range": {
                "sheetId": sheet_id,
                "dimension": "COLUMNS",
                "startIndex": col_index,
                "endIndex": col_index + 1,
            },
            "properties": {"pixelSize": width_px},
            "fields": "pixelSize",
        }
    }


def freeze_row_req(sheet_id):
    return {
        "updateSheetProperties": {
            "properties": {
                "sheetId": sheet_id,
                "gridProperties": {"frozenRowCount": 1},
            },
            "fields": "gridProperties.frozenRowCount",
        }
    }


def row_height_req(sheet_id, start, end, height_px):
    return {
        "updateDimensionProperties": {
            "range": {
                "sheetId": sheet_id,
                "dimension": "ROWS",
                "startIndex": start,
                "endIndex": end,
            },
            "properties": {"pixelSize": height_px},
            "fields": "pixelSize",
        }
    }


# ---------- メイン処理 ----------

def main():
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    service = build("sheets", "v4", credentials=creds)
    ss = service.spreadsheets()

    sheet_names = list(SHEETS_DATA.keys())

    # 既存シート情報を取得
    meta = ss.get(spreadsheetId=SPREADSHEET_ID).execute()
    existing = {s["properties"]["title"]: s["properties"]["sheetId"]
                for s in meta["sheets"]}

    # --- シートを追加（なければ作成） ---
    add_requests = []
    for name in sheet_names:
        if name not in existing:
            add_requests.append({
                "addSheet": {"properties": {"title": name}}
            })

    if add_requests:
        res = ss.batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": add_requests}
        ).execute()

    # ID再取得
    meta = ss.get(spreadsheetId=SPREADSHEET_ID).execute()
    sheet_id_map = {s["properties"]["title"]: s["properties"]["sheetId"]
                    for s in meta["sheets"]}

    # --- データ書き込み & フォーマット ---
    for name, cases in SHEETS_DATA.items():
        sheet_id = sheet_id_map[name]
        rows = build_rows(cases)
        total_rows = len(rows)

        # データ書き込み
        ss.values().update(
            spreadsheetId=SPREADSHEET_ID,
            range=f"'{name}'!A1",
            valueInputOption="RAW",
            body={"values": [[c["userEnteredValue"].get("stringValue", "")
                               for c in row["values"]] for row in rows]},
        ).execute()

        # フォーマット適用
        fmt_requests = [
            {
                "updateCells": {
                    "rows": rows,
                    "fields": "userEnteredFormat,userEnteredValue",
                    "start": {"sheetId": sheet_id, "rowIndex": 0, "columnIndex": 0},
                }
            },
            freeze_row_req(sheet_id),
            row_height_req(sheet_id, 0, 1, 24),           # ヘッダー高さ
            row_height_req(sheet_id, 1, total_rows, 80),  # データ行高さ
        ]
        for col_i, width in enumerate(COL_WIDTHS_PX):
            fmt_requests.append(col_width_req(sheet_id, col_i, width))

        ss.batchUpdate(
            spreadsheetId=SPREADSHEET_ID,
            body={"requests": fmt_requests}
        ).execute()

        print(f"  ✓ {name} ({len(cases)} 件)")

    print("\n完了しました！")
    print(f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit")


if __name__ == "__main__":
    main()