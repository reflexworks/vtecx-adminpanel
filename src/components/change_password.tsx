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
// パスワード変更モード: トークンによる再発行 or ログイン済みユーザによる変更
type ChangeMode = 'token' | 'loggedin'

export const ChangePassword = (_props: any) => {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking')
  const [changeMode, setChangeMode] = useState<ChangeMode>('token')
  const [passresetToken, setPassresetToken] = useState<string | undefined>(undefined)
  const [old_password, setOldPassword] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [password_re, setPasswordRe] = React.useState('')

  const [error, setError] = React.useState('')

  // パスワード変更ボタン判定
  const [is_regist_btn, setIsRegistBtn] = useState(true)

  const [check_old_password, setCheckOldPassword] = React.useState<boolean>(false)
  const checkOldPassword = React.useCallback((value: string) => {
    const checked = !value
    setCheckOldPassword(checked)
    return checked
  }, [])

  const [check_password, setCheckPassword] = React.useState<boolean>(false)
  const checkPassword = React.useCallback((value: string) => {
    const checked = value ? validation('password', value).error : true
    setCheckPassword(checked)
    return checked
  }, [])

  const [check_password_re, setCheckPasswordRe] = React.useState<boolean>(false)
  const checkRePassword = React.useCallback(
    (value: string) => {
      const checked = password !== value
      setCheckPasswordRe(checked)
      return checked
    },
    [password]
  )

  const isRegistBtn = React.useCallback(
    (value?: string, type?: string) => {
      const is_old_password_error =
        changeMode === 'loggedin'
          ? checkOldPassword(type === 'old_password' ? (value ?? old_password) : old_password)
          : false
      const is_password_error = checkPassword(type === 'password' ? value || password : password)
      const is_password_re_error = checkRePassword(
        type === 'password_re' ? value || password_re : password_re
      )
      setIsRegistBtn(!(!is_old_password_error && !is_password_error && !is_password_re_error))
    },
    [changeMode, old_password, password, password_re]
  )

  // 送信
  const [is_completed, setIsCompleted] = useState(false)
  const [active_step, setActiveStep] = useState(2)
  const handleSubmit = async (_e: any) => {
    _e.preventDefault()

    if (changeMode === 'token') {
      // トークンによるパスワード再発行
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
    } else {
      // ログイン済みユーザによるパスワード変更（旧パスワード必須）
      const req = [
        {
          contributor: [
            { uri: 'urn:vte.cx:auth:' + ',' + vtecxauth.getHashpass(password) },
            { uri: 'urn:vte.cx:oldphash:' + vtecxauth.getHashpass(old_password) }
          ]
        }
      ]
      try {
        await fetcher('/d/?_changephash', 'put', req)
        setIsCompleted(true)
        setActiveStep(3)
      } catch (error) {
        setError(
          'パスワード変更に失敗しました。旧パスワードをご確認のうえ、もう一度お試しください。'
        )
      }
    }
  }

  // 認証リンク検証（hash と query の両方をサポート）
  useEffect(() => {
    const url = new URL(window.location.href)
    const hash = url.hash.startsWith('#/?') ? url.hash.slice(3) : ''
    const params = new URLSearchParams(hash || url.search.slice(1))

    const rxid = params.get('_RXID') || ''
    const token = params.get('_passreset_token') || ''

    if (rxid && token) {
      // トークンモード: _RXID と _passreset_token の両方がある場合
      fetcher('/d/?_uid&_RXID=' + encodeURIComponent(rxid), 'get')
        .then(() => {
          setPassresetToken(token)
          setChangeMode('token')
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
            setChangeMode('token')
            setAuthStatus('ok')
          } else {
            setAuthStatus('invalid')
          }
        })
    } else {
      // ログイン済みモード: _RXID・_passreset_token がない場合はログイン状態を確認
      fetcher('/d/?_uid', 'get')
        .then(() => {
          setChangeMode('loggedin')
          setAuthStatus('ok')
        })
        .catch(() => {
          setAuthStatus('invalid')
        })
    }
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
          <Typography
            variant="body2"
            component={'div'}
            paddingTop={10}
            data-testid="verifying-message"
          >
            リンクを検証しています…
          </Typography>
        </Grid>
      )}
      {authStatus === 'invalid' && (
        <>
          <Grid size={{ xs: 12, md: md }}>
            <Typography
              variant="body2"
              color={red[900]}
              component={'div'}
              paddingTop={10}
              data-testid="token-error-message"
            >
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
          {changeMode === 'token' && (
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
          )}
          {!is_completed && (
            <Grid size={{ xs: 12, md: md }} data-testid="change-password-form">
              {/* 現在のパスワード（loggedinモードのみ） */}
              {changeMode === 'loggedin' && (
                <Box
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 3,
                    mb: 3
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                    現在のパスワード
                  </Typography>
                  <FormControl fullWidth variant="outlined">
                    <TextField
                      type="password"
                      label="現在のパスワード"
                      size="small"
                      value={old_password}
                      onChange={event => {
                        setOldPassword(event.target.value)
                        isRegistBtn(event.target.value, 'old_password')
                      }}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { 'data-testid': 'old-password' }
                      }}
                      error={check_old_password}
                      onBlur={() => isRegistBtn()}
                    />
                  </FormControl>
                  {check_old_password && (
                    <Typography
                      variant="caption"
                      color="error"
                      component={'div'}
                      data-testid="old-password-error"
                    >
                      現在のパスワードを入力してください。
                    </Typography>
                  )}
                </Box>
              )}

              {/* 新しいパスワード */}
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                  p: 3,
                  mb: 3,
                  bgcolor: 'grey.50'
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  新しいパスワード
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component={'div'}
                  sx={{ mb: 2 }}
                >
                  8文字以上で、かつ数字・英字・記号を最低1文字含む必要があります。
                </Typography>
                <Grid size={12} sx={{ mb: 4 }}>
                  <FormControl fullWidth variant="outlined">
                    <TextField
                      type="password"
                      label="新しいパスワード"
                      size="small"
                      value={password}
                      onChange={event => {
                        setPassword(event.target.value)
                        isRegistBtn(event.target.value, 'password')
                      }}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { 'data-testid': 'new-password' }
                      }}
                      error={check_password}
                      onBlur={() => isRegistBtn()}
                    />
                  </FormControl>
                  {check_password && (
                    <Typography
                      variant="caption"
                      color="error"
                      component={'div'}
                      data-testid="new-password-error"
                    >
                      ご使用するパスワードは<b>8文字以上で、かつ数字・英字・記号を最低1文字含む</b>
                      必要があります。
                    </Typography>
                  )}
                </Grid>
                <Grid size={12}>
                  <FormControl fullWidth variant="outlined">
                    <TextField
                      type="password"
                      label="新しいパスワード（確認）"
                      size="small"
                      value={password_re}
                      onChange={event => {
                        setPasswordRe(event.target.value)
                        isRegistBtn(event.target.value, 'password_re')
                      }}
                      slotProps={{
                        inputLabel: { shrink: true },
                        htmlInput: { 'data-testid': 'new-password-confirm' }
                      }}
                      error={check_password_re}
                      onBlur={() => isRegistBtn()}
                    />
                  </FormControl>
                  {check_password_re && (
                    <Typography
                      variant="caption"
                      color="error"
                      component={'div'}
                      data-testid="new-password-confirm-error"
                    >
                      パスワードが一致しません。
                    </Typography>
                  )}
                </Grid>
              </Box>

              <Grid size={12}>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={is_regist_btn}
                  onClick={handleSubmit}
                  data-testid="change-password-button"
                >
                  パスワードを変更する
                </Button>
                {error && (
                  <Typography variant="caption" color={red[900]} paddingTop={3} component={'div'}>
                    {error}
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
          {is_completed && (
            <Grid size={{ xs: 12, md: md }}>
              <Typography data-testid="success-message">
                新しいパスワードへの変更が完了しました。
              </Typography>
            </Grid>
          )}
          <Grid size={{ xs: 12, md: md }}>
            <Typography variant="caption" component={'div'}>
              {changeMode === 'token' && (
                <Link href={'login.html'} data-testid="back-to-login-link">
                  ログインに戻る
                </Link>
              )}
              {changeMode === 'loggedin' && (
                <Link href={'index.html'} data-testid="back-to-main-link">
                  メインに戻る
                </Link>
              )}
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
