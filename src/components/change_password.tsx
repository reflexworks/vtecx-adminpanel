import '../styles/index.css'
import * as vtecxauth from '@vtecx/vtecxauth'
import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { fetcher } from '../utils/fetcher'
import Loader from './parts/Loader'
import Grid from '@mui/material/Grid2'
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  FormControl,
  TextField,
  Link,
  Button
} from '@mui/material'
import { red } from '@mui/material/colors'
import validation from '../utils/validation'
import Footer from './parts/Footer'

type AuthStatus = 'checking' | 'ok' | 'invalid'

export const ChangePassword = (_props: any) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [passresetToken, setPassresetToken] = useState<string | undefined>(undefined)
  const [password, setPassword] = React.useState('')
  const [password_re, setPasswordRe] = React.useState('')

  const [error, setError] = React.useState('')

  // パスワード変更ボタン判定
  const [is_regist_btn, setIsRegistBtn] = useState(true)
  const isRegistBtn = () => {
    const is_password_error = password ? validation('password', password).error : true
    const is_password_re_error = password !== password_re
    setIsRegistBtn(!(!is_password_error && !is_password_re_error))
  }

  // 送信
  const [is_completed, setIsCompleted] = useState(false)
  const [active_step, setActiveStep] = useState(2)
  const handleSubmit = async (_e: any) => {
    _e.preventDefault()
    const req = [
      {
        contributor: [
          { uri: 'urn:vte.cx:auth:' + ',' + vtecxauth.getHashpass(password) },
          { uri: 'urn:vte.cx:passreset_token:' + passresetToken }
        ]
      }
    ]
    try {
      await fetcher('/d/?_changephash', 'put', req)
      setIsCompleted(true)
      setActiveStep(3)
    } catch (error) {
      setError('パスワード変更に失敗しました。もう一度画面をリロードして実行してください。')
    }
  }

  // 認証リンク検証（hash と query の両方をサポート）
  useEffect(() => {
    const url = new URL(window.location.href)
    const hash = url.hash.startsWith('#/?') ? url.hash.slice(3) : ''
    const params = new URLSearchParams(hash || url.search.slice(1))

    const rxid = params.get('_RXID') || ''
    const token = params.get('_passreset_token') || ''

    if (!rxid || !token) {
      setAuthStatus('invalid')
      return
    }

    fetcher('/d/?_uid&_RXID=' + encodeURIComponent(rxid), 'get')
      .then(() => {
        setPassresetToken(token)
        setAuthStatus('ok')
      })
      .catch((err: any) => {
        const title = err?.response?.data?.feed?.title || ''
        const status = err?.response?.status
        // ワンタイムIDを既に使用済みでも token があれば続行可
        if (
          (status === 401 || status === 403) &&
          title.includes('RXID has been used more than once.')
        ) {
          setPassresetToken(token)
          setAuthStatus('ok')
        } else {
          setAuthStatus('invalid')
        }
      })
  }, [])

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
        <Box paddingTop={10} width={'100%'}>
          <Grid container size={12} width={'100%'}>
            <Grid size={6} textAlign={'left'}>
              <Typography variant="h5">パスワード変更</Typography>
            </Grid>
            <Grid size={6} textAlign={'right'}>
              <img src="../img/logo.svg" />
            </Grid>
          </Grid>
        </Box>
      </Grid>
      {authStatus === 'checking' && (
        <Grid size={{ xs: 12, md: md }}>
          <Typography variant="body2" component={'div'} paddingTop={10}>
            リンクを検証しています…
          </Typography>
        </Grid>
      )}
      {authStatus === 'invalid' && (
        <>
          <Grid size={{ xs: 12, md: md }}>
            <Typography variant="body2" color={red[900]} component={'div'} paddingTop={10}>
              このリンクは無効か、有効期限が切れています。
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: md }}>
            <Typography variant="caption" component={'div'}>
              このリンクは無効か、有効期限が切れています。
            </Typography>
            <Typography variant="caption">
              お手数ですが、<Link href={'forgot_password.html'}>パスワード再発行</Link>から
              新しいメールを受け取ってください。
            </Typography>
          </Grid>
        </>
      )}
      {authStatus === 'ok' && (
        <>
          <Grid size={{ xs: 12, md: md }} textAlign={'left'} paddingTop={5}>
            <Stepper
              activeStep={active_step}
              alternativeLabel
              sx={{ width: '85%', mb: 4, mx: 'auto' }}
            >
              {[
                '本人確認用メール送信',
                'メール送信完了',
                'パスワード変更',
                'パスワード変更完了'
              ].map((label: any) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Grid>
          {!is_completed && (
            <>
              <Grid size={{ xs: 12, md: md }}>
                <Typography variant="body2">新しいパスワードを入力してください。</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: md }}>
                <FormControl fullWidth variant="outlined">
                  <TextField
                    type="password"
                    label="パスワード"
                    size="small"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    slotProps={{
                      inputLabel: {
                        shrink: true
                      }
                    }}
                    onBlur={() => isRegistBtn()}
                  />
                </FormControl>
                <Typography variant="caption">
                  ご使用するパスワードは<b>8文字以上で、かつ数字・英字・記号を最低1文字含む</b>
                  必要があります。
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: md }}>
                <FormControl fullWidth variant="outlined">
                  <TextField
                    type="password"
                    label="確認のためもう一度パスワードを入力してください"
                    size="small"
                    value={password_re}
                    onChange={event => setPasswordRe(event.target.value)}
                    slotProps={{
                      inputLabel: {
                        shrink: true
                      }
                    }}
                    onBlur={() => isRegistBtn()}
                  />
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: md }}>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={is_regist_btn}
                  onClick={handleSubmit}
                >
                  パスワードを変更する
                </Button>
                {error && (
                  <Typography variant="caption" color={red[900]} paddingTop={3} component={'div'}>
                    {error}
                  </Typography>
                )}
              </Grid>
            </>
          )}
          {is_completed && (
            <Grid size={{ xs: 12, md: md }}>
              <Typography>新しいパスワードへの変更が完了しました。</Typography>
            </Grid>
          )}
          <Grid size={{ xs: 12, md: md }}>
            <Typography variant="caption" component={'div'}>
              <Link href={'login.html'}>ログインに戻る</Link>
            </Typography>
          </Grid>
        </>
      )}
    </Grid>
  )
}

const App: React.FC = () => (
  <Loader>
    <ChangePassword />
    <Footer />
  </Loader>
)

createRoot(document.getElementById('content')!).render(<App />)
