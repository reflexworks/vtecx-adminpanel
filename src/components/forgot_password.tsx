import '../styles/index.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { ReCaptchaProvider, useReCaptcha } from 'react-enterprise-recaptcha'
import { fetcher } from '../utils/fetcher'
import Loader from './parts/loader'
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
import Footer from './parts/footer'

export const ForgotPassword = (_props: any) => {
  const [required_captcha, setRequiredCaptcha] = React.useState<boolean>(true)
  const { executeRecaptcha } = useReCaptcha()
  const [email, setEmail] = React.useState('')

  const [error, setError] = React.useState('')

  const [is_regist_btn, setIsRegistBtn] = React.useState<boolean>(true)
  const isRegistBtn = () => {
    const is_email_error = email ? validation('email', email).error : true
    setIsRegistBtn(!!is_email_error)
  }

  const [is_completed, setIsCompleted] = React.useState<boolean>(false)
  const [active_step, setActiveStep] = React.useState<number>(0)

  const handleSubmit = async (_e: any) => {
    _e.preventDefault()

    const req = [{ contributor: [{ uri: 'urn:vte.cx:auth:' + email }] }]

    let captchaOpt = ''
    try {
      if (required_captcha) {
        const token = await executeRecaptcha('passreset')
        captchaOpt = '&g-recaptcha-token=' + encodeURIComponent(token)
      }
    } catch {
      setError('セキュリティ確認に失敗しました。しばらくしてから再度お試しください。')
      return
    }

    setRequiredCaptcha(false)
    try {
      await fetcher('/d/?_passreset' + captchaOpt, 'post', req)
      setIsCompleted(true)
      setActiveStep(1)
    } catch (_error) {
      setRequiredCaptcha(true)
      setError('メールの送信に失敗しました。画面をリロードしてもう一度実行してください。')
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
              <Typography variant="h5">パスワード変更</Typography>
            </Grid>
            <Grid size={6} textAlign={'right'}>
              <img src="../img/logo.svg" />
            </Grid>
          </Grid>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: md }} textAlign={'left'} paddingTop={5}>
        <Stepper activeStep={active_step} alternativeLabel sx={{ mb: 4, mx: 'auto' }}>
          {['本人確認用メール送信', 'メール送信完了', 'パスワード変更', 'パスワード変更完了'].map(
            (label: any) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            )
          )}
        </Stepper>
      </Grid>
      {!is_completed && (
        <>
          <Grid size={{ xs: 12, md: md }}>
            <Typography variant="body2" component={'div'} paddingBottom={1}>
              ご本人確認のため、登録されているメールアドレスを入力してください。
            </Typography>
            <Typography variant="caption" component={'div'} paddingBottom={1}>
              入力されたアドレスへメール送信されますので、メールに記載されているURLへアクセスしてください。
            </Typography>
            <Typography variant="caption" component={'div'} paddingBottom={1}>
              アクセスされたページにて新しいパスワードを入力して登録が完了です。
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, md: md }}>
            <FormControl fullWidth variant="outlined">
              <TextField
                type="email"
                label="メールアドレス"
                size="small"
                value={email}
                onChange={event => setEmail(event.target.value)}
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
            <Button variant="contained" fullWidth disabled={is_regist_btn} onClick={handleSubmit}>
              メールを送信する
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
        <>
          <Grid size={{ xs: 12, md: md }}>
            <Typography variant="body2">メールを送信しました。</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: md }}>
            <Typography variant="body2" component={'div'} paddingBottom={1}>
              入力したメールアドレスにメールを送信しました。
            </Typography>
            <Typography variant="body2" component={'div'} paddingBottom={1}>
              メールに記載されているURLへアクセスしてください。
            </Typography>
          </Grid>
        </>
      )}
      <Grid size={{ xs: 12, md: md }}>
        <Typography variant="caption" component={'div'}>
          <Link href={'login.html'}>ログインに戻る</Link>
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
    <ReCaptchaProvider reCaptchaKey={siteKey} language="ja" defaultAction="passreset">
      <Loader>
        <ForgotPassword />
      </Loader>
      <Footer />
    </ReCaptchaProvider>
  )
}

createRoot(document.getElementById('content')!).render(<App />)
