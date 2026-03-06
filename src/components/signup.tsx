// signup.tsx
import '../styles/index.css'
import * as vtecxauth from '@vtecx/vtecxauth'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { ReCaptchaProvider, useReCaptcha } from 'react-enterprise-recaptcha'

import Grid from '@mui/material/Grid2'
import {
  Box,
  Typography,
  FormControl,
  TextField,
  Button,
  Link,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  FormControlLabel
} from '@mui/material'
import { red } from '@mui/material/colors'
import { fetcher } from '../utils/fetcher'
import Loader from './parts/Loader'
import validation from '../utils/validation'
import Footer from './parts/Footer'

export const Signup = (_props: any) => {
  const [required_captcha, setRequiredCaptcha] = React.useState<boolean>(true)
  const { executeRecaptcha } = useReCaptcha()

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [password_re, setPasswordRe] = React.useState('')
  const [terms1, setTerms1] = React.useState(false)

  const [error, setError] = React.useState('')

  const [is_regist_btn, setIsRegistBtn] = React.useState<boolean>(true)
  const [check_email, setCheckEmail] = React.useState<boolean>(false)
  const checkEmail = React.useCallback((value: string) => {
    const checked = value ? validation('email', value).error : true
    setCheckEmail(checked)
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
      const is_email_error = checkEmail(type === 'email' ? value || email : email)
      const is_password_error = checkPassword(type === 'password' ? value || password : password)
      const is_password_re_error = checkRePassword(
        type === 'password_re' ? value || password_re : password_re
      )
      const terms1_value = type === 'terms1' ? Boolean(value) || terms1 : terms1
      setIsRegistBtn(
        !(!is_email_error && !is_password_error && !is_password_re_error && terms1_value)
      )
    },
    [email, password, password_re, terms1]
  )

  const [is_completed, setIsCompleted] = React.useState<boolean>(false)
  const [active_step, setActiveStep] = React.useState<number>(0)

  const handleSubmit = async (_e: any) => {
    _e.preventDefault()

    const req = [
      {
        contributor: [
          {
            uri: 'urn:vte.cx:auth:' + email + ',' + vtecxauth.getHashpass(password)
          }
        ]
      }
    ]

    let captchaOpt = ''
    try {
      if (required_captcha) {
        const token = await executeRecaptcha('adduser')
        captchaOpt = '&g-recaptcha-token=' + encodeURIComponent(token)
      }
    } catch {
      setError('セキュリティ確認に失敗しました。しばらくしてから再度お試しください。')
      return
    }

    setRequiredCaptcha(false)
    try {
      await fetcher('/d/?_adduser' + captchaOpt, 'post', req)
      setIsCompleted(true)
      setActiveStep(1)
    } catch (error) {
      setRequiredCaptcha(true)
      if (error?.response) {
        if (error.response.data.feed.title.indexOf('Duplicated key. account = ') !== -1) {
          setError('そのアカウントは既に登録済みです。')
        } else if (error.response.data.feed.title.indexOf('Mail setting is required') !== -1) {
          setError('アカウント登録を実行するには事前にメール設定をする必要があります。')
        } else {
          setError(
            'アカウント登録に失敗しました。アカウントまたはパスワードが使用できない可能性があります。'
          )
        }
      }
    }
  }

  const [md] = React.useState(7)

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
              <Typography variant="h5">アカウント新規登録(無料)</Typography>
            </Grid>
            <Grid size={6} textAlign={'right'}>
              <img src="../img/logo.svg" />
            </Grid>
          </Grid>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: md }} textAlign={'left'} paddingTop={5}>
        <Stepper activeStep={active_step} alternativeLabel sx={{ width: '85%', mb: 3, mx: 'auto' }}>
          {['仮登録', '仮登録完了', '本登録完了'].map((label: any, index: number) => (
            <Step key={label} data-testid={`stepper-step${index + 1}`}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Grid>
      {!is_completed && (
        <>
          <Grid size={{ xs: 12, md: md }}>
            <Typography variant="body2">
              まずは仮登録を行います。以下の入力フォームで必要な項目を入力してください。
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: md }}>
            <FormControl fullWidth variant="outlined">
              <TextField
                type="email"
                label="メールアドレス"
                size="small"
                value={email}
                onChange={event => {
                  setEmail(event.target.value)
                  isRegistBtn(event.target.value, 'email')
                }}
                error={check_email}
                slotProps={{
                  inputLabel: {
                    shrink: true
                  },
                  htmlInput: {
                    'data-testid': 'email'
                  }
                }}
                onBlur={() => isRegistBtn()}
              />
            </FormControl>
            {check_email && (
              <Typography
                variant="caption"
                color="error"
                component={'div'}
                data-testid="email-error"
              >
                メールアドレスの形式が正しくありません。
              </Typography>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: md }}>
            <FormControl fullWidth variant="outlined">
              <TextField
                type="password"
                label="パスワード"
                size="small"
                value={password}
                onChange={event => {
                  setPassword(event.target.value)
                  isRegistBtn(event.target.value, 'password')
                }}
                error={check_password}
                slotProps={{
                  inputLabel: {
                    shrink: true
                  },
                  htmlInput: {
                    'data-testid': 'password'
                  }
                }}
                onBlur={() => isRegistBtn()}
              />
            </FormControl>
            <Typography
              variant="caption"
              color={check_password ? 'error' : undefined}
              data-testid="password-hint"
            >
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
                onChange={event => {
                  setPasswordRe(event.target.value)
                  isRegistBtn(event.target.value, 'password_re')
                }}
                error={check_password_re}
                slotProps={{
                  inputLabel: {
                    shrink: true
                  },
                  htmlInput: {
                    'data-testid': 'password-confirm'
                  }
                }}
                onBlur={() => isRegistBtn()}
              />
            </FormControl>
            {check_password_re && (
              <Typography
                variant="caption"
                color="error"
                component={'div'}
                data-testid="password-confirm-error"
              >
                パスワードが一致しません。
              </Typography>
            )}
          </Grid>
          <Grid size={{ xs: 12, md: md }}>
            <Typography>利用規約に同意の上、仮登録ボタンを押下してください。</Typography>
            <FormControlLabel
              name="terms1"
              onChange={(e: React.SyntheticEvent<Element, Event>, checked: boolean) => {
                console.log(e)
                setTerms1(checked)
                isRegistBtn(String(checked), 'terms1')
              }}
              control={<Checkbox data-testid="terms-checkbox" />}
              label={
                <Typography variant="caption">
                  「
                  <Link href={'user_terms.html'} data-testid="terms-link">
                    利用規約
                  </Link>
                  」に同意します。
                </Typography>
              }
            />
          </Grid>
          <Grid size={{ xs: 12, md: md }}>
            <Typography variant="caption">
              上記メールアドレスに本登録用のメールを送信します。メールが届きましたら、
              <b>本文のリンクをクリックして本登録を完了</b>してください。
            </Typography>
            <Button
              variant="contained"
              fullWidth
              disabled={is_regist_btn}
              onClick={handleSubmit}
              data-testid="signup-button"
            >
              アカウントの仮登録をする
            </Button>
            {error && (
              <Typography
                variant="caption"
                color={red[900]}
                paddingTop={3}
                component={'div'}
                data-testid="error-message"
              >
                {error}
              </Typography>
            )}
          </Grid>
        </>
      )}
      {is_completed && (
        <>
          <Grid size={{ xs: 12, md: md }} data-testid="signup-complete-message">
            <Typography>仮登録が完了しました。</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: md }}>
            <Typography component={'div'} variant="caption" paddingBottom={1}>
              入力したメールアドレスに本登録用のメールを送信しました。
            </Typography>
            <Typography component={'div'} variant="caption" paddingBottom={1}>
              メール本文のリンクをクリックし、本登録に移行してください。
            </Typography>
          </Grid>
        </>
      )}
      <Grid size={{ xs: 12, md: md }}>
        <Typography variant="caption" component={'div'}>
          <Link href={'login.html'} data-testid="back-to-login-link">
            ログインに戻る
          </Link>
        </Typography>
      </Grid>
    </Grid>
  )
}

const App: React.FC = () => {
  const [siteKey, setSiteKey] = React.useState<string>()
  React.useEffect(() => {
    const key =
      typeof location !== 'undefined' && location.hostname.includes('localhost')
        ? '6LfCvngUAAAAAJssdYdZkL5_N8blyXKjjnhW4Dsn'
        : '6LdUGHgUAAAAAOU28hR61Qceg2WP_Ms3kcuMHmmR'
    setSiteKey(key)
  }, [])

  if (!siteKey) return null

  return (
    <ReCaptchaProvider reCaptchaKey={siteKey} language="ja" defaultAction="adduser">
      <Loader>
        <Signup />
      </Loader>
      <Footer />
    </ReCaptchaProvider>
  )
}

createRoot(document.getElementById('content')!).render(<App />)
