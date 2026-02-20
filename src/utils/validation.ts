export interface ValidationProps {
  error: boolean
  message: string
}

/**
 * 共通：バリデーションチェック
 * @param type
 * @param value
 * @return true=エラーあり、false=エラーなし
 */
const validation = (type: string, value: string) => {
  const res: ValidationProps = {
    error: false,
    message: ''
  }

  if (type === 'required') {
    res.error = value ? false : true
    if (res.error) {
      res.message = '必須項目です。'
    }
  }

  if (type === 'service_name') {
    if (value && value.match(/^[a-z0-9-]*$/)) {
      if (value[0].match(/^[a-z]*$/)) {
        res.error = false
      } else {
        res.error = true
        res.message = 'サービス名は半角英字から開始してください。'
      }
    } else {
      res.error = true
      if (value) {
        res.message =
          'サービス名に不正な文字が入力されています。小文字の半角英数とハイフン（-）が使用可能です。'
      } else {
        res.message = 'サービス名を入力してください。'
      }
    }
  }
  if (type === 'schema_name') {
    if (value && value.match(/^[a-z0-9_]*$/)) {
      if (value[0].match(/^[a-z]*$/)) {
        res.error = false
      } else {
        res.error = true
        res.message = '項目名は半角英字から開始してください。'
      }
    } else {
      res.error = true
      if (value) {
        res.message =
          '項目名に不正な文字が入力されています。小文字の半角英数とアンダーバー（_）が使用可能です。'
      } else {
        res.message = '項目名を入力してください。'
      }
    }
  }

  if (type === 'endpoint') {
    if (value && value.match(/^[a-zA-Z0-9_]*$/)) {
      if (value[0].match(/^[a-zA-Z]*$/)) {
        res.error = false
        res.message = ''
      } else {
        res.error = true
        res.message = 'エンドポイント名は半角英字から開始してください。'
      }
    } else {
      if (value) {
        res.error = true
        res.message =
          'エンドポイント名に不正な文字が入力されています。半角英数とアンダーバー(_)が使用可能です。'
      } else {
        res.error = true
        res.message = 'エンドポイント名を入力してください。'
      }
    }
  }

  if (!value) return res

  if (type === 'email') {
    // eslint-disable-next-line no-useless-escape
    const regexp = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    res.error = !regexp.test(value)
    if (res.error) {
      //res.message = 'メールアドレスの形式が不正です。正しいメールアドレスを入力してください。'
    }
  }

  if (type === 'password') {
    const regexp = /^(?=.*?[0-9])(?=.*?[a-zA-Z])(?=.*?[!-/@_])[A-Za-z!-9@_]{8,}$/
    res.error = !regexp.test(value)
    if (res.error) {
      res.message = '安全なパスワードではありません。'
    }
  }

  return res
}

export default validation
