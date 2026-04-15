import React, { useState } from 'react'
import { Box, Typography, Button, CircularProgress, Divider, Alert } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import HomeIcon from '@mui/icons-material/Home'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import MainContainer from '../../parts/Container'
import { openBillingPortal } from '../../../utils/stripe'

const theme = createTheme({
  palette: {
    primary: { main: '#1976D2', light: '#E3F0FB' },
    background: { default: '#F5F6FA' },
    text: { primary: '#212121', secondary: '#757575' }
  },
  typography: {
    fontFamily: "'Hiragino Sans','Yu Gothic UI','Meiryo',sans-serif"
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, fontSize: 14 }
      }
    }
  }
})

const PaymentFailure: React.FC = () => {
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState<string>('')

  const handleOpenPortal = async () => {
    setPortalLoading(true)
    setPortalError('')
    try {
      await openBillingPortal()
    } catch (e: unknown) {
      setPortalError(e instanceof Error ? e.message : 'ポータルURLの取得に失敗しました。')
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <MainContainer title="決済失敗">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          py={6}
          px={2}
        >
          {/* アイコン */}
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: '#F44336',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
              boxShadow: '0 4px 20px rgba(244,67,54,0.3)'
            }}
          >
            <ErrorOutlineIcon sx={{ color: '#fff', fontSize: 44 }} />
          </Box>

          <Typography variant="h5" fontWeight={700} mb={1} textAlign="center">
            決済に失敗しました
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={0.5} textAlign="center">
            お支払い処理中にエラーが発生しました。
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4} textAlign="center">
            クレジットカード情報の確認・変更はStripe Customer Portalから行えます。
          </Typography>

          <Divider sx={{ width: '100%', maxWidth: 480, mb: 4 }} />

          {portalError && (
            <Alert severity="error" sx={{ mb: 2, width: '100%', maxWidth: 480 }}>
              {portalError}
            </Alert>
          )}

          {/* リンクボタン群 */}
          <Box display="flex" flexDirection="column" gap={2} width="100%" maxWidth={480}>
            <Button
              variant="contained"
              size="large"
              startIcon={<HomeIcon />}
              href="/#/servicelist"
              fullWidth
            >
              メインメニューに戻る
            </Button>

            <Button
              variant="outlined"
              size="large"
              color="error"
              startIcon={
                portalLoading ? <CircularProgress size={18} color="inherit" /> : <OpenInNewIcon />
              }
              onClick={handleOpenPortal}
              disabled={portalLoading}
              fullWidth
            >
              {portalLoading ? '読み込み中...' : 'Stripe Customer Portalに移動する'}
            </Button>
          </Box>
        </Box>
      </MainContainer>
    </ThemeProvider>
  )
}

export default PaymentFailure
