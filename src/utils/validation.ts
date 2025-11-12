/**
 * 共通：バリデーションチェック
 * @param _type
 * @param _value
 * @return true=エラーあり、false=エラーなし
 */
const validation = (_type: string, _value: string) => {
  const res = {
    error: false,
    message: ''
  }

  if (_type === 'required') {
    res.error = _value ? false : true
    if (res.error) {
      res.message = '必須項目です。'
    }
  }

  if (!_value) return res

  if (_type === 'email') {
    // eslint-disable-next-line no-useless-escape
    const regexp = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    res.error = !regexp.test(_value)
    if (res.error) {
      //res.message = 'メールアドレスの形式が不正です。正しいメールアドレスを入力してください。'
    }
  }

  if (_type === 'password') {
    const regexp = /^(?=.*?[0-9])(?=.*?[a-zA-Z])(?=.*?[!-/@_])[A-Za-z!-9@_]{8,}$/
    res.error = !regexp.test(_value)
    if (res.error) {
      res.message = '安全なパスワードではありません。'
    }
  }

  return res
}

export default validation
