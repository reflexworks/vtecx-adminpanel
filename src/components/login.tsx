// login.tsx
import '../styles/index.css'
import * as vtecxauth from '@vtecx/vtecxauth'
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { ReCaptchaProvider, useReCaptcha } from 'react-enterprise-recaptcha'

import useLoader from '../hooks/useLoader'

import Grid from '@mui/material/Grid2'
import { FormControl, TextField, Button, Link, Typography, Box } from '@mui/material'
import { red } from '@mui/material/colors'
import { fetcher } from '../utils/fetcher'
import Loader from './parts/loader'

// =====================
// Login コンポーネント
// =====================
export const Login = (_props: any) => {
  const { setLoader } = useLoader()

  const [requiredCaptcha, setRequiredCaptcha]: any = React.useState(false)
  const [error, setError]: any = React.useState('')

  const [username, setUsername] = React.useState('')
  const [pswrd, setPswrd] = React.useState('')

  // 送信時にトークンを取得
  const { executeRecaptcha } = useReCaptcha()

  async function handleSubmit(_e: any) {
    _e.preventDefault()

    setError('')

    if (!username || !pswrd) return false

    setLoader(true)

    const authToken = vtecxauth.getAuthToken(username, pswrd)

    // requiredCaptcha が true のときだけトークンを付与
    let captchaOpt = ''
    try {
      if (requiredCaptcha) {
        const token = await executeRecaptcha('login') // ← 指定の action=login
        captchaOpt = '&g-recaptcha-token=' + encodeURIComponent(token)
      }
    } catch (err) {
      // reCAPTCHA が取得できない場合はサーバーに行かずリトライさせる

      setError('セキュリティ確認に失敗しました。しばらくしてから再度お試しください。')
      return
    }

    try {
      await fetcher('/d/?_login' + captchaOpt, 'get', null, {
        'X-WSSE': authToken
      })
      location.href = 'index.html'
    } catch (_error: any) {
      if (_error?.response) {
        setError('ログインに失敗しました。メールアドレスまたはパスワードに誤りがあります。')
        // サーバーが「次回はCaptcha必須」と返した場合にフラグを立てる
        if (_error.response.data?.feed?.title === 'Captcha required at next login.') {
          setRequiredCaptcha(true)
        }
      }
    }
    setLoader(false)
  }

  const [md] = React.useState(6)

  return (
    <Grid container direction="column" justifyContent="center" alignItems="center" spacing={4}>
      <Grid size={{ xs: 12, md: md }} textAlign={'left'}>
        <div style={{ marginTop: 20, paddingTop: 20 }}>
          <a href="my_page.html" style={{ color: '#000', textDecoration: 'none' }}>
            <img src="../img/logo_vt.svg" />
          </a>
        </div>
      </Grid>
      <Grid size={{ xs: 12, md: md }} textAlign={'left'}>
        <Box paddingTop={10}>
          <Typography variant="h5">ログイン</Typography>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: md }}>
        <FormControl fullWidth variant="outlined">
          <TextField
            type=""
            label="アカウントID"
            size="small"
            value={username}
            onChange={event => setUsername(event.target.value)}
            slotProps={{
              inputLabel: {
                shrink: true
              }
            }}
          />
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, md: md }}>
        <FormControl fullWidth variant="outlined">
          <TextField
            type="password"
            label="パスワード"
            size="small"
            value={pswrd}
            onChange={event => setPswrd(event.target.value)}
            slotProps={{
              inputLabel: {
                shrink: true
              }
            }}
          />
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12, md: md }}>
        <FormControl fullWidth variant="outlined">
          <Button variant="contained" size="small" onClick={handleSubmit}>
            ログイン
          </Button>
        </FormControl>
        {error && (
          <Typography variant="caption" color={red[900]} paddingTop={3} component={'div'}>
            {error}
          </Typography>
        )}
      </Grid>
      <Grid size={{ xs: 12, md: md }} textAlign={'center'}>
        <Link href={'forgot_password.html'}>
          <Typography variant="caption">パスワードをお忘れの方はこちら</Typography>
        </Link>
      </Grid>
      <Grid size={{ xs: 12, md: md }} textAlign={'center'}>
        <Typography variant="caption">
          まだvte.cxのアカウントをお持ちでない方は
          <Link href={'signup.html'}>
            <Typography variant="caption">アカウント登録</Typography>
          </Link>
          をお済ませください。
        </Typography>
      </Grid>
    </Grid>
  )
}

// =====================
// App ルート: Provider で包む
// =====================
const App: React.FC = () => {
  // 旧コードの sitekey 切り替えロジックを Provider に転用
  const [siteKey, setSiteKey] = useState<string>()

  useEffect(() => {
    const key =
      typeof location !== 'undefined' && location.hostname.includes('localhost')
        ? '6LfCvngUAAAAAJssdYdZkL5_N8blyXKjjnhW4Dsn'
        : '6LdUGHgUAAAAAOU28hR61Qceg2WP_Ms3kcuMHmmR'
    setSiteKey(key)
  }, [])

  if (!siteKey) return null // 初期化待ち

  return (
    // Enterprise ライブラリの Provider
    //    defaultAction に「login」を設定（RECAPTCHA_ACTION 相当）
    <ReCaptchaProvider reCaptchaKey={siteKey} language="ja" defaultAction="login">
      <Loader>
        <Login />
      </Loader>
    </ReCaptchaProvider>
  )
}

createRoot(document.getElementById('content')!).render(<App />)
