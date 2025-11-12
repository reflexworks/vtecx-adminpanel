import Grid from '@mui/material/Grid2'
import { Box, Typography, Stepper, Step, StepLabel, Link } from '@mui/material'
import '../styles/index.css'
import React from 'react'
import { createRoot } from 'react-dom/client'

export const CompleteRegistration = (_props: any) => {
  return (
    <Grid container direction="column" justifyContent="center" alignItems="center" spacing={4}>
      <Grid size={{ xs: 12, md: 5 }} textAlign={'left'}>
        <div style={{ marginTop: 20, paddingTop: 20 }}>
          <a href="my_page.html" style={{ color: '#000', textDecoration: 'none' }}>
            <img src="../img/logo_vt.svg" />
          </a>
        </div>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }} textAlign={'left'}>
        <Box paddingTop={2}>
          <Typography variant="h5">アカウント新規登録</Typography>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }} textAlign={'left'} paddingTop={5}>
        <Stepper activeStep={2} alternativeLabel sx={{ width: '85%', mb: 3, mx: 'auto' }}>
          {['仮登録', '仮登録完了', '本登録完了'].map((label: any) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Typography variant="body2">本登録が完了しました。</Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Typography variant="caption" component={'div'}>
          <Link href={'login.html'}>ログインに戻る</Link>
        </Typography>
      </Grid>
    </Grid>
  )
}
const App: any = () => {
  return <CompleteRegistration />
}

createRoot(document.getElementById('content')!).render(<App />)
