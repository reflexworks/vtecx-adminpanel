import dayjs from 'dayjs'
import React, { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { fetcher } from '../../../utils/fetcher'
import { openBillingPortal } from '../../../utils/stripe'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import CancelIcon from '@mui/icons-material/Cancel'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import MainContainer from '../../parts/Container'
import useUid from '../../../hooks/useUid'

// ─── Theme ───────────────────────────────────────────────────────

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

// ─── Types ───────────────────────────────────────────────────────

interface ServiceEntry {
  serviceName: string
  subtitle: string
  subscriptionId: string | null
  cancelAt: string | null
  paymentFailedAt: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────

function parseContributors(contributors: { uri: string }[]): {
  subscriptionId: string | null
  cancelAt: string | null
  paymentFailedAt: string | null
} {
  let subscriptionId: string | null = null
  let cancelAt: string | null = null
  let paymentFailedAt: string | null = null

  for (const c of contributors) {
    const uri = c.uri ?? ''
    if (uri.startsWith('urn:vte.cx:stripe:sub:')) {
      subscriptionId = uri.replace('urn:vte.cx:stripe:sub:', '')
    } else if (uri.startsWith('urn:vte.cx:stripe:cancel:')) {
      cancelAt = uri.replace('urn:vte.cx:stripe:cancel:', '')
    } else if (uri.startsWith('urn:vte.cx:stripe:payment_failed:')) {
      paymentFailedAt = uri.replace('urn:vte.cx:stripe:payment_failed:', '')
    }
  }

  return { subscriptionId, cancelAt, paymentFailedAt }
}

function parseServiceEntry(raw: any): ServiceEntry | null {
  try {
    // サービス名の取得:
    // link[rel=self] の ___href は "/_user/{uid}/service/{name}" または "/_service/{name}" 形式
    // id フィールドは "/_service/{name},{seq}" 形式
    // いずれかから確実にサービス名を取り出す
    let serviceName = ''

    const selfLink = (raw.link ?? []).find((l: any) => l.___rel === 'self')
    const href: string = selfLink?.___href ?? ''

    if (href.includes('/service/')) {
      // "/_user/{uid}/service/{name}" 形式
      serviceName = href.split('/service/').pop() ?? ''
    } else if (href.includes('/_service/')) {
      // "/_service/{name}" 形式
      serviceName = href.replace('/_service/', '').split('/')[0]
    }

    // link から取れない場合は id フィールドにフォールバック
    // id は "/_service/{name},{seq}" 形式
    if (!serviceName && raw.id) {
      serviceName = (raw.id as string).split(',')[0].replace('/_service/', '')
    }

    if (!serviceName) return null

    const subtitle: string = raw.subtitle ?? ''
    const contributors: { uri: string }[] = raw.contributor ?? []
    const { subscriptionId, cancelAt, paymentFailedAt } = parseContributors(contributors)

    return { serviceName, subtitle, subscriptionId, cancelAt, paymentFailedAt }
  } catch {
    return null
  }
}

// ─── Stripe Customer Portal Button ────────────────────────────────

const CustomerPortalButton: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const handleOpen = async () => {
    setLoading(true)
    setError('')
    try {
      await openBillingPortal()
    } catch {
      setError('ポータルURLの取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 1, fontSize: 12 }}>
          {error}
        </Alert>
      )}
      <Button
        variant="outlined"
        size="small"
        endIcon={loading ? <CircularProgress size={14} /> : <OpenInNewIcon fontSize="small" />}
        onClick={handleOpen}
        disabled={loading}
      >
        Stripe Customer Portalで確認する
      </Button>
    </>
  )
}

// ─── Billing Page ─────────────────────────────────────────────────

const BillingPage: React.FC = () => {
  const { uid } = useUid()
  const [services, setServices] = useState<ServiceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string>('')

  const fetchServices = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetcher(`/d/_user/${encodeURIComponent(uid)}/service?f`, 'get')
      // data が null/undefined（204等）の場合は空配列として扱う
      const data = res?.data
      const rawList: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.feed?.entry)
          ? data.feed.entry
          : []
      const parsed = rawList.map(parseServiceEntry).filter((e): e is ServiceEntry => e !== null)
      setServices(parsed)
    } catch {
      setFetchError('データ取得に失敗しました。')
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    fetchServices()
  }, [fetchServices])

  // 集計
  const cancelPendingServices = services.filter(s => s.cancelAt !== null)
  const paymentFailedServices = services.filter(s => s.paymentFailedAt !== null)

  const hasBilling =
    services.some(s => s.subscriptionId !== null) ||
    cancelPendingServices.length > 0 ||
    paymentFailedServices.length > 0

  return (
    <ThemeProvider theme={theme}>
      <MainContainer title="課金情報">
        {loading ? (
          <Box display="flex" justifyContent="center" py={8}>
            <CircularProgress />
          </Box>
        ) : fetchError ? (
          <Alert severity="error">{fetchError}</Alert>
        ) : !hasBilling ? (
          <Card variant="outlined">
            <Box textAlign="center" py={6}>
              <SentimentDissatisfiedIcon sx={{ fontSize: 48, color: '#BDBDBD', mb: 1.5 }} />
              <Typography variant="h6" fontWeight={700} color="text.secondary" mb={1}>
                課金情報はありません
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Proプランへのアップグレードはサービス一覧の「プラン変更」から行えます。
              </Typography>
            </Box>
          </Card>
        ) : (
          <Box display="flex" flexDirection="column" gap={3}>
            {/* ── 今月の請求額の確認・登録クレジットカード・請求履歴 ── */}
            <Card variant="outlined">
              <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                  <ReceiptLongIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="subtitle2" fontWeight={700}>
                    今月の請求額の確認・登録クレジットカード・請求履歴
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  登録クレジットカードの確認・変更および請求履歴はStripe Customer
                  Portalでご確認いただけます。
                </Typography>
                <CustomerPortalButton />
              </CardContent>
            </Card>

            {/* ── Free環境へ戻し申請中のサービス ── */}
            {cancelPendingServices.length > 0 && (
              <Card variant="outlined">
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CancelIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Free環境へ戻し申請中のサービス
                    </Typography>
                    <Chip
                      label={cancelPendingServices.length}
                      size="small"
                      color="warning"
                      sx={{ fontSize: 11, height: 20 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    サブスクリプション期間満了までPro環境のままご利用いただけます。
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#FFFDE7' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>サービス名</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>期間満了日時</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {cancelPendingServices.map((s, i) => (
                          <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell sx={{ fontSize: 13 }}>{s.serviceName}</TableCell>
                            <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                              {s.cancelAt ? dayjs(s.cancelAt).format('YYYY/MM/DD HH:mm:ss') : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* ── 支払い失敗があるサービス ── */}
            {paymentFailedServices.length > 0 && (
              <Card variant="outlined" sx={{ borderColor: 'error.light' }}>
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700} color="error.main">
                      支払い失敗があるサービス
                    </Typography>
                    <Chip
                      label={paymentFailedServices.length}
                      size="small"
                      color="error"
                      sx={{ fontSize: 11, height: 20 }}
                    />
                  </Box>
                  <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>
                    以下のサービスで支払いに失敗しています。Stripe Customer
                    Portalでカード情報をご確認ください。
                  </Alert>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#FFEBEE' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>サービス名</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: 12 }}>失敗発生日時</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paymentFailedServices.map((s, i) => (
                          <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell sx={{ fontSize: 13 }}>{s.serviceName}</TableCell>
                            <TableCell sx={{ fontSize: 13, color: 'error.main' }}>
                              {s.paymentFailedAt ?? '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box mt={2}>
                    <CustomerPortalButton />
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        )}
      </MainContainer>
    </ThemeProvider>
  )
}

export default BillingPage
