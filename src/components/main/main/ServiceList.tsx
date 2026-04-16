import React from 'react'
import { Add, Refresh } from '@mui/icons-material'
import {
  Tooltip,
  IconButton,
  Button,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  AlertTitle,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Menu,
  MenuItem,
  Card,
  CardContent,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Link
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import PublicIcon from '@mui/icons-material/Public'
import CheckIcon from '@mui/icons-material/Check'
import ScheduleIcon from '@mui/icons-material/Schedule'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteIcon from '@mui/icons-material/Delete'
import VtecxApp from '../../../typings'
import dayjs from 'dayjs'
import { grey, lightGreen, orange } from '@mui/material/colors'
import useService from '../../../hooks/useService'
import BasicModal from '../../parts/Modal'
import validation, { ValidationProps } from '../../../utils/validation'
import MainContainer from '../../parts/Container'
import useUid from '../../../hooks/useUid'
import { fetcher } from '../../../utils/fetcher'
import { upgradeToProduction, downgradeToStaging } from '../../../utils/stripe'

// ─── Types ───────────────────────────────────────────────────────

// 'cancel-pending' = Pro契約中だがFree戻し申請済み（期間満了までPro）
type EnvType = 'free' | 'pro' | 'cancel-pending'

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * entry.contributor から解約申請日時を取得する。
 * "urn:vte.cx:stripe:cancel:{datetime}" の形式。
 */
function getCancelAt(entry: VtecxApp.Entry): string | null {
  for (const c of entry.contributor ?? []) {
    const uri = c.uri ?? ''
    if (uri.startsWith('urn:vte.cx:stripe:cancel:')) {
      return uri.replace('urn:vte.cx:stripe:cancel:', '')
    }
  }
  return null
}

/**
 * entry.subtitle と contributor から EnvType を判定する。
 */
function getEnvType(entry: VtecxApp.Entry): EnvType {
  if (entry.subtitle !== 'production') return 'free'
  if (getCancelAt(entry) !== null) return 'cancel-pending'
  return 'pro'
}

// ─── Constants ────────────────────────────────────────────────────

interface CompareRow {
  label: string
  free: string
  pro: string
  proHighlight?: boolean
}

const COMPARE_ROWS: CompareRow[] = [
  { label: '通信プロトコル', free: 'http / https', pro: 'https のみ', proHighlight: false },
  { label: 'ドメイン', free: 'xxx.vte.cx', pro: 'xxx.vte.cx', proHighlight: false },
  { label: 'アクセス数', free: '50,000/日', pro: '無制限', proHighlight: true },
  { label: 'ストレージ', free: '100MB', pro: '5GB/サービス', proHighlight: true },
  { label: '月額', free: '無料', pro: '¥20,000/サービス', proHighlight: false }
]

// ─── Status Chip ─────────────────────────────────────────────────

const StatusChip: React.FC<{ env: EnvType; cancelAt: string | null; 'data-testid'?: string }> = ({
  env,
  cancelAt,
  'data-testid': testId
}) => {
  if (env === 'cancel-pending') {
    return (
      <Tooltip
        title={
          cancelAt
            ? `Free移行予定日: ${dayjs(cancelAt).format('YYYY/MM/DD HH:mm:ss')}`
            : '解約申請中'
        }
        placement="top"
      >
        <Chip
          label="解約申請中"
          size="small"
          icon={<ScheduleIcon style={{ fontSize: 13 }} />}
          data-testid={testId}
          sx={{
            bgcolor: orange[50],
            color: orange[800],
            borderColor: orange[300],
            border: '1px solid',
            fontWeight: 600,
            fontSize: 11,
            '& .MuiChip-icon': { color: orange[600] }
          }}
        />
      </Tooltip>
    )
  }
  return (
    <Chip
      label={env === 'pro' ? 'Pro' : 'Free'}
      variant={env === 'pro' ? undefined : 'outlined'}
      color={env === 'pro' ? 'success' : undefined}
      data-testid={testId}
    />
  )
}

// ─── Downgrade Result ─────────────────────────────────────────────

/** ダウングレード成功後に表示する移行日・Pro期間の情報 */
const DowngradeResult: React.FC<{ cancelAt: string; serviceName: string }> = ({
  cancelAt,
  serviceName
}) => {
  const cancelDay = dayjs(cancelAt)
  const now = dayjs()
  const daysRemaining = cancelDay.diff(now, 'day')
  const proUntil = cancelDay.format('YYYY/MM/DD HH:mm:ss')

  return (
    <Box textAlign="center" py={2}>
      <Box
        sx={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          bgcolor: orange[500],
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2.5
        }}
      >
        <ScheduleIcon sx={{ color: '#fff', fontSize: 30 }} />
      </Box>
      <Typography variant="h6" fontWeight={700} mb={1}>
        Free環境への戻し申請が完了しました
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        「{serviceName}」はサブスクリプション期間満了まで引き続きPro環境でご利用いただけます。
      </Typography>
      <Card
        variant="outlined"
        sx={{ mb: 2, textAlign: 'left', bgcolor: orange[50], borderColor: orange[200] }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Free移行予定日
            </Typography>
            <Typography fontWeight={700} color={orange[800]}>
              {proUntil}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Pro環境の残り期間
            </Typography>
            <Typography fontWeight={700} color={orange[800]}>
              {daysRemaining > 0 ? `あと ${daysRemaining} 日` : '本日まで'}
            </Typography>
          </Box>
        </CardContent>
      </Card>
      <Typography variant="caption" color="text.secondary">
        期間満了後は自動的にFree環境へ移行します。
      </Typography>
    </Box>
  )
}

// ─── Public Settings Modal ────────────────────────────────────────

type ModalStep = 'view' | 'confirm-upgrade' | 'confirm-downgrade' | 'downgrade-done'

interface PublicSettingsModalProps {
  open: boolean
  serviceName: string | undefined
  currentEnv: EnvType
  cancelAt: string | null
  onClose: () => void
  onEnvChanged: () => void
  onUpgraded: () => void
}

const PublicSettingsModal: React.FC<PublicSettingsModalProps> = ({
  open,
  serviceName,
  currentEnv,
  cancelAt,
  onClose,
  onEnvChanged,
  onUpgraded
}) => {
  const [step, setStep] = React.useState<ModalStep>('view')
  const [apiError, setApiError] = React.useState<string>('')
  const [processing, setProcessing] = React.useState<boolean>(false)
  const [downgradeCancelAt, setDowngradeCancelAt] = React.useState<string>('')

  const [agreedToTerms, setAgreedToTerms] = React.useState<boolean>(false)

  // モーダルが開くたびに表示内容をリセット
  React.useEffect(() => {
    if (open) {
      setStep('view')
      setApiError('')
      setAgreedToTerms(false)
    }
  }, [open])

  const isCurrentPro = currentEnv === 'pro'
  const isCancelPending = currentEnv === 'cancel-pending'

  const handleClose = () => {
    setStep('view')
    setApiError('')
    onClose()
  }

  const handleConfirmUpgrade = async (): Promise<void> => {
    if (!serviceName) return
    setProcessing(true)
    setApiError('')
    try {
      await upgradeToProduction(serviceName)
      // 202: 即時変更完了 → モーダルを閉じてメッセージ表示
      onUpgraded()
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : '変更に失敗しました。')
    } finally {
      setProcessing(false)
    }
  }

  const { uid } = useUid()

  const handleConfirmDowngrade = async (): Promise<void> => {
    if (!serviceName || !uid) return
    setProcessing(true)
    setApiError('')
    try {
      // 1. Free環境への戻し申請
      await downgradeToStaging(serviceName)
      // 2. サービス状態を再取得して cancelAt を得る
      const res = await fetcher(
        `/d/_user/${encodeURIComponent(uid)}/service/${encodeURIComponent(serviceName)}?e`,
        'get'
      )
      // レスポンスは配列直接形式・feed.entry形式・単一オブジェクト形式に対応
      const data = res?.data
      const entry = Array.isArray(data)
        ? data[0]
        : Array.isArray(data?.feed?.entry)
          ? data.feed.entry[0]
          : (data ?? {})
      const contributors: { uri?: string }[] = entry?.contributor ?? []
      let cancelAt = ''
      for (const c of contributors) {
        const uri = c.uri ?? ''
        if (uri.startsWith('urn:vte.cx:stripe:cancel:')) {
          cancelAt = uri.replace('urn:vte.cx:stripe:cancel:', '')
          break
        }
      }
      setDowngradeCancelAt(cancelAt)
      onEnvChanged()
      setStep('downgrade-done')
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : '変更に失敗しました。')
    } finally {
      setProcessing(false)
    }
  }

  // ─ Step: view ──────────────────────────────────────────────────
  const renderView = () => (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2.5}>
        「<strong>{serviceName}</strong>」の現在のプランです。
      </Typography>

      {/* プランカード */}
      <Box display="flex" gap={2} mb={2.5}>
        {(['free', 'pro'] as const).map(env => {
          const isCurrent =
            (env === 'pro' && (isCurrentPro || isCancelPending)) ||
            (env === 'free' && !isCurrentPro && !isCancelPending)
          return (
            <Card
              key={env}
              variant="outlined"
              sx={{
                flex: 1,
                border: isCurrent ? '2px solid #1976D2' : '1px solid #E0E0E0',
                bgcolor: isCurrent ? '#E3F0FB' : '#fff'
              }}
            >
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color={isCurrent ? 'primary' : 'text.secondary'}
                  >
                    {env === 'free' ? 'Free環境' : 'Pro環境'}
                  </Typography>
                  {isCurrent && (
                    <Chip
                      label="現在"
                      color="primary"
                      size="small"
                      sx={{ fontSize: 10, height: 20 }}
                    />
                  )}
                </Box>
                <Typography fontWeight={800} fontSize={16}>
                  {env === 'free' ? 'Free' : 'Pro'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {env === 'free' ? '無料' : '¥20,000/月'}
                </Typography>
              </CardContent>
            </Card>
          )
        })}
      </Box>

      {/* 比較テーブル */}
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2.5 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#FAFAFA' }}>
              <TableCell
                sx={{ fontWeight: 700, fontSize: 12, color: 'text.secondary', width: '35%' }}
              />
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: 13, color: '#757575' }}>
                Free環境
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: 13, color: '#1976D2' }}>
                Pro環境
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {COMPARE_ROWS.map((row, i) => (
              <TableRow
                key={i}
                sx={{ bgcolor: i % 2 === 0 ? '#FAFAFA' : '#fff', '&:last-child td': { border: 0 } }}
              >
                <TableCell sx={{ fontWeight: 600, fontSize: 12, color: 'text.secondary' }}>
                  {row.label}
                </TableCell>
                <TableCell align="center" sx={{ fontSize: 12, color: '#BDBDBD' }}>
                  {row.free}
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontSize: 12,
                    fontWeight: row.proHighlight ? 700 : 400,
                    color: row.proHighlight ? '#1976D2' : 'text.primary'
                  }}
                >
                  {row.proHighlight && (
                    <CheckIcon sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
                  )}
                  {row.pro}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 状態メッセージ */}
      {isCancelPending && cancelAt ? (
        <Alert
          severity="warning"
          icon={<ScheduleIcon fontSize="small" />}
          sx={{ mb: 2.5, fontSize: 13 }}
        >
          Free環境への戻し申請済みです。
          <strong>{dayjs(cancelAt).format('YYYY/MM/DD HH:mm:ss')}</strong>{' '}
          までPro環境でご利用いただけます。
          なお、キャンセル申請中はPro環境に変更することはできません。
        </Alert>
      ) : isCurrentPro ? (
        <Alert severity="success" sx={{ mb: 2.5, fontSize: 13 }}>
          Pro環境で稼働中です。
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 2.5, fontSize: 13 }}>
          Pro環境に変更することで、アクセス数無制限・ストレージ5GBが利用できます。クレジットカードの入力はStripeの画面で行います。
        </Alert>
      )}

      {apiError && (
        <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>
          {apiError}
        </Alert>
      )}

      <Box display="flex" gap={1.5}>
        <Button variant="outlined" onClick={handleClose} sx={{ flex: 1 }}>
          閉じる
        </Button>
        {!isCurrentPro && !isCancelPending && (
          <Button
            variant="contained"
            onClick={() => {
              setApiError('')
              setStep('confirm-upgrade')
            }}
            sx={{ flex: 2 }}
          >
            pro環境に変更する →
          </Button>
        )}
        {isCurrentPro && (
          <Button
            variant="outlined"
            color="warning"
            onClick={() => {
              setApiError('')
              setStep('confirm-downgrade')
            }}
            sx={{ flex: 2 }}
          >
            Free環境に戻す
          </Button>
        )}
      </Box>
    </Box>
  )

  // ─ Step: confirm-upgrade ─────────────────────────────────────
  const renderConfirmUpgrade = () => (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={2.5}>
        「<strong>{serviceName}</strong>」をPro環境へ変更します。
      </Typography>
      <Alert
        severity="info"
        icon={<CreditCardIcon fontSize="small" />}
        sx={{ mb: 2.5, fontSize: 13 }}
      >
        次の画面でStripeのクレジットカード入力画面に移動します。カード情報を入力して決済を完了してください。
      </Alert>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2.5 }}>
        <Table size="small">
          <TableBody>
            {(
              [
                ['サービス', serviceName ?? ''],
                ['変更後', 'Pro環境'],
                ['月額', '¥20,000 / 月'],
                ['お支払い', 'Stripeにてクレジットカード決済']
              ] as [string, string][]
            ).map(([k, v], i) => (
              <TableRow
                key={i}
                sx={{ bgcolor: i % 2 === 0 ? '#FAFAFA' : '#fff', '&:last-child td': { border: 0 } }}
              >
                <TableCell
                  sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 13, width: '40%' }}
                >
                  {k}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{v}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <FormControlLabel
        sx={{ mb: 2, alignItems: 'flex-start' }}
        control={
          <Checkbox
            checked={agreedToTerms}
            onChange={e => setAgreedToTerms(e.target.checked)}
            size="small"
            sx={{ pt: 0.3 }}
            inputProps={{ 'aria-label': '利用規約に同意する' }}
          />
        }
        label={
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
            <Link
              href="https://vte.cx/specified_commercial_transactions.html"
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
            >
              特定商取引法に基づく表記
            </Link>
            を確認し、利用規約に同意します。
          </Typography>
        }
      />
      {apiError && (
        <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>
          {apiError}
        </Alert>
      )}
      <Box display="flex" gap={1.5}>
        <Button
          variant="outlined"
          onClick={() => {
            setApiError('')
            setAgreedToTerms(false)
            setStep('view')
          }}
          disabled={processing}
          sx={{ flex: 1 }}
        >
          ← 戻る
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirmUpgrade}
          disabled={processing || !agreedToTerms}
          sx={{ flex: 2 }}
          startIcon={
            processing ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <CreditCardIcon fontSize="small" />
            )
          }
        >
          {processing ? '処理中...' : 'クレジットカード入力画面へ'}
        </Button>
      </Box>
    </Box>
  )

  // ─ Step: confirm-downgrade ────────────────────────────────────
  const renderConfirmDowngrade = () => (
    <Box>
      <Alert severity="warning" sx={{ mb: 2.5, fontSize: 13 }}>
        申請後はサブスクリプション期間満了までPro環境のままですが、次の更新はされません。
        <strong>なお、一度申請するとキャンセル期間中はPro環境に戻すことはできません。</strong>
      </Alert>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 2.5 }}>
        <Table size="small">
          <TableBody>
            {(
              [
                ['サービス', serviceName ?? ''],
                ['変更後', 'Free環境（期間満了後）'],
                ['月額', '¥0（次回更新なし）']
              ] as [string, string][]
            ).map(([k, v], i) => (
              <TableRow
                key={i}
                sx={{ bgcolor: i % 2 === 0 ? '#FAFAFA' : '#fff', '&:last-child td': { border: 0 } }}
              >
                <TableCell
                  sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 13, width: '40%' }}
                >
                  {k}
                </TableCell>
                <TableCell sx={{ fontWeight: 600, fontSize: 13 }}>{v}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {apiError && (
        <Alert severity="error" sx={{ mb: 2, fontSize: 12 }}>
          {apiError}
        </Alert>
      )}

      <Box display="flex" gap={1.5}>
        <Button
          variant="outlined"
          onClick={() => {
            setApiError('')
            setStep('view')
          }}
          disabled={processing}
          sx={{ flex: 1 }}
        >
          ← 戻る
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleConfirmDowngrade}
          disabled={processing}
          sx={{ flex: 2 }}
          startIcon={processing ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {processing ? '処理中...' : 'Free環境への戻しを申請する'}
        </Button>
      </Box>
    </Box>
  )

  // ─ Step: downgrade-done ───────────────────────────────────────
  const renderDowngradeDone = () => (
    <>
      <DowngradeResult cancelAt={downgradeCancelAt} serviceName={serviceName ?? ''} />
      <Button variant="contained" fullWidth onClick={handleClose} sx={{ mt: 1 }}>
        閉じる
      </Button>
    </>
  )

  const stepContent: Record<ModalStep, React.ReactNode> = {
    view: renderView(),
    'confirm-upgrade': renderConfirmUpgrade(),
    'confirm-downgrade': renderConfirmDowngrade(),
    'downgrade-done': renderDowngradeDone()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      data-testid="delete-confirm-dialog"
    >
      <DialogTitle
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <PublicIcon fontSize="small" sx={{ color: '#1976D2' }} />
          <Typography fontWeight={700}>プラン変更</Typography>
          {serviceName && (
            <Chip label={serviceName} size="small" sx={{ fontSize: 11, height: 20, ml: 0.5 }} />
          )}
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>{stepContent[step]}</DialogContent>
    </Dialog>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────

const PASSPHRASE = 'service delete'

interface DeleteConfirmModalProps {
  open: boolean
  serviceName: string | undefined
  isPro: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  open,
  serviceName,
  isPro,
  onClose,
  onConfirm
}) => {
  const [input, setInput] = React.useState<string>('')
  const [processing, setProcessing] = React.useState<boolean>(false)

  const handleClose = () => {
    setInput('')
    onClose()
  }

  const handleConfirm = async () => {
    setProcessing(true)
    try {
      await onConfirm()
    } finally {
      setProcessing(false)
      setInput('')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      data-testid="delete-confirm-dialog"
    >
      <DialogTitle
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
          <Typography fontWeight={700}>サービスの削除</Typography>
          {serviceName && (
            <Chip label={serviceName} size="small" sx={{ fontSize: 11, height: 20, ml: 0.5 }} />
          )}
        </Box>
        <IconButton onClick={handleClose} size="small" disabled={processing}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>
          削除したデータは復旧できません。この操作は取り消せません。
        </Alert>
        {isPro && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }} data-testid="delete-pro-warning">
            このサービスはPro契約中です。削除するとサブスクリプションも解除されます。
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" mb={1.5}>
          削除を確認するには、下のフィールドに <strong>{PASSPHRASE}</strong> と入力してください。
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder={PASSPHRASE}
          value={input}
          inputProps={{ 'data-testid': 'delete-passphrase-input' }}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          error={input.length > 0 && input !== PASSPHRASE}
          helperText={
            input.length > 0 && input !== PASSPHRASE
              ? `「${PASSPHRASE}」を正確に入力してください`
              : ''
          }
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1.5 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={processing}
          sx={{ flex: 1 }}
          data-testid="delete-cancel-button"
        >
          キャンセル
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={input !== PASSPHRASE || processing}
          sx={{ flex: 2 }}
          data-testid="delete-confirm-button"
          startIcon={
            processing ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <DeleteIcon fontSize="small" />
            )
          }
        >
          {processing ? '削除中...' : 'サービスを削除する'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Create Service Modal（既存） ─────────────────────────────────

const CreateServiceModal = ({
  open,
  handleClose,
  createService,
  afterCreateService
}: {
  open: boolean
  handleClose: () => void
  createService: (create_service_name: string | undefined) => Promise<boolean | undefined>
  afterCreateService: (success: boolean | undefined) => void
}) => {
  const [create_service_name, setCreateServiceName] = React.useState<string | undefined>()
  const handleCreateService = React.useCallback(async () => {
    const success = await createService(create_service_name)
    afterCreateService(success)
    handleClose()
  }, [create_service_name])

  const [success, setSuccess] = React.useState<ValidationProps>({ error: true, message: '' })

  return (
    <BasicModal open={open} handleClose={handleClose} data-testid="create-service-modal">
      <Typography variant="h6">サービス新規作成</Typography>
      <Box paddingTop={5}>
        <TextField
          label="サービス名"
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { 'data-testid': 'service-name-input' }
          }}
          fullWidth
          placeholder="小文字の半角英数とハイフン（-）が使用可能です。"
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setSuccess(validation('service_name', e.target.value))
          }}
          onBlur={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setCreateServiceName(e.target.value)
          }}
        />
        {success.error && success.message && (
          <Typography
            variant="caption"
            paddingTop={2}
            color="error"
            component="div"
            data-testid="service-name-error"
          >
            {success.message}
          </Typography>
        )}
        {(!success.error || !success.message) && (
          <Typography
            variant="caption"
            paddingTop={2}
            color="error"
            component="div"
            sx={{ visibility: 'hidden' }}
          >
            &nbsp;
          </Typography>
        )}
        <Box paddingTop={2}>
          <Button
            color="inherit"
            variant="outlined"
            onClick={handleClose}
            style={{ marginRight: '15px' }}
            data-testid="create-cancel-button"
          >
            キャンセル
          </Button>
          <Button
            color="success"
            variant="contained"
            onClick={handleCreateService}
            startIcon={<Add />}
            disabled={success.error}
            data-testid="create-confirm-button"
          >
            新規作成
          </Button>
        </Box>
      </Box>
    </BasicModal>
  )
}

// ─── Service List ─────────────────────────────────────────────────

const ServiceList = () => {
  const { list: _list, get: getService, post: createService, deleteService } = useService()
  const list = _list

  const [show_create_modal, setShowCreateModal] = React.useState<boolean>(false)
  const [entrys, setEntrys] = React.useState<VtecxApp.Entry[] | undefined>()

  // プラン変更モーダル用 state
  const [publicSettingsOpen, setPublicSettingsOpen] = React.useState<boolean>(false)
  const [selectedServiceName, setSelectedServiceName] = React.useState<string | undefined>()
  const [selectedEnv, setSelectedEnv] = React.useState<EnvType>('free')
  const [selectedCancelAt, setSelectedCancelAt] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (list) {
      const sortedEntries = [...list].sort((a, b) => {
        const isAProduction = a.subtitle === 'production'
        const isBProduction = b.subtitle === 'production'
        if (isAProduction && !isBProduction) return -1
        if (!isAProduction && isBProduction) return 1
        return new Date(b.published ?? 0).getTime() - new Date(a.published ?? 0).getTime()
      })
      setEntrys(sortedEntries)
    }
  }, [list])

  const [messeage, setMesseage] = React.useState<
    { type: 'info' | 'error'; value: string } | undefined
  >()

  // 「...」メニュー用
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null)
  const [menuEntry, setMenuEntry] = React.useState<VtecxApp.Entry | null>(null)

  // サービス削除モーダル用
  const [deleteModalOpen, setDeleteModalOpen] = React.useState<boolean>(false)
  const [deleteEntry, setDeleteEntry] = React.useState<VtecxApp.Entry | null>(null)

  const afterCreateService = React.useCallback(
    (success: boolean | undefined) => {
      if (success) {
        getService()
        setMesseage({ type: 'info', value: 'サービス作成を作成しました。' })
        setTimeout(() => setMesseage(undefined), 10000)
      } else {
        setMesseage({
          type: 'error',
          value: 'サービス作成に失敗しました。もう一度お試しください。'
        })
      }
    },
    [getService]
  )

  const handleDeleteConfirm = React.useCallback(async () => {
    const service_name = deleteEntry?.id?.split(',')[0].replace('/_service/', '')
    const success = await deleteService(service_name)
    setDeleteModalOpen(false)
    setDeleteEntry(null)
    if (success) {
      getService()
      setMesseage({ type: 'info', value: `${service_name} を削除しました。` })
      setTimeout(() => setMesseage(undefined), 10000)
    } else {
      setMesseage({ type: 'error', value: `${service_name} の削除に失敗しました。` })
    }
  }, [deleteEntry, deleteService, getService])

  const handlePublicSettingsClick = (entry: VtecxApp.Entry) => {
    const service_name = entry.id?.split(',')[0].replace('/_service/', '') ?? ''
    setSelectedServiceName(service_name)
    setSelectedEnv(getEnvType(entry))
    setSelectedCancelAt(getCancelAt(entry))
    setPublicSettingsOpen(true)
  }

  return (
    <MainContainer
      title="サービス一覧"
      action={
        <>
          <Tooltip title="Reload data" placement="right" enterDelay={1000}>
            <div>
              <IconButton size="small" aria-label="refresh" onClick={getService}>
                <Refresh />
              </IconButton>
            </div>
          </Tooltip>
          <Button
            variant="contained"
            onClick={() => setShowCreateModal(true)}
            startIcon={<Add />}
            data-testid="create-service-button"
          >
            新規作成
          </Button>
          <CreateServiceModal
            open={show_create_modal}
            handleClose={() => setShowCreateModal(false)}
            createService={createService}
            afterCreateService={afterCreateService}
          />
        </>
      }
    >
      <Box paddingBottom={2} display={messeage ? 'block' : 'none'}>
        <Alert severity={messeage?.type}>{messeage?.value}</Alert>
      </Box>
      <Alert
        severity="info"
        data-testid="no-service-alert"
        sx={{ display: entrys && entrys.length === 0 ? 'block' : 'none' }}
      >
        <AlertTitle>サービスを作成してください。</AlertTitle>
        「新規作成」ボタンからサービスを作成して開始してください。
      </Alert>
      <TableContainer
        component={Paper}
        hidden={!entrys || (entrys && entrys.length === 0)}
        data-testid="service-table"
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ display: { xs: 'table-cell', md: 'table-cell' } }}>
                ステータス
              </TableCell>
              <TableCell>サービス</TableCell>
              <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                更新日時
              </TableCell>
              <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {entrys &&
              entrys.map((entry: VtecxApp.Entry) => {
                const service_name = entry.id?.split(',')[0].replace('/_service/', '')
                const published = dayjs(entry.published).format('YYYY/MM/DD HH:mm:ss')
                const env = getEnvType(entry)
                const cancelAt = getCancelAt(entry)

                const rowBg =
                  env === 'pro' ? lightGreen[50] : env === 'cancel-pending' ? orange[50] : undefined
                const rowHoverBg =
                  env === 'pro'
                    ? lightGreen[100]
                    : env === 'cancel-pending'
                      ? orange[100]
                      : grey[100]

                return (
                  entry.subtitle !== 'deleted' && (
                    <TableRow
                      key={entry.id}
                      data-testid={`service-row-${service_name}`}
                      sx={{
                        '&:last-child td, &:last-child th': { border: 0 },
                        backgroundColor: rowBg,
                        '&:hover': { backgroundColor: rowHoverBg }
                      }}
                    >
                      <TableCell
                        align="center"
                        sx={{ display: { xs: 'table-cell', md: 'table-cell' } }}
                      >
                        <StatusChip
                          env={env}
                          cancelAt={cancelAt}
                          data-testid={`plan-chip-${service_name}`}
                        />
                      </TableCell>
                      <TableCell component="th" scope="row">
                        <Typography
                          variant="body2"
                          component="div"
                          sx={{
                            overflowWrap: 'break-word',
                            wordWrap: 'break-word',
                            maxWidth: { xs: '300px', md: '500px' }
                          }}
                        >
                          {service_name}
                        </Typography>
                        {env === 'cancel-pending' && cancelAt && (
                          <Typography variant="caption" color={orange[700]} display="block">
                            {dayjs(cancelAt).format('YYYY/MM/DD HH:mm:ss')} にFree移行予定
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Typography variant="body2" color={grey[700]}>
                          {published}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                        <Button
                          startIcon={<PublicIcon fontSize="small" />}
                          data-testid={`public-settings-${service_name}`}
                          onClick={() => handlePublicSettingsClick(entry)}
                        >
                          プラン変更
                        </Button>
                        <Button
                          data-testid={`admin-link-${service_name}`}
                          onClick={() => {
                            location.href = `redirect.html?service_name=${service_name}`
                          }}
                        >
                          管理画面
                        </Button>
                        <IconButton
                          size="small"
                          data-testid={`more-menu-${service_name}`}
                          onClick={e => {
                            setMenuAnchor(e.currentTarget)
                            setMenuEntry(entry)
                          }}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )
                )
              })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 「...」メニュー */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null)
          setMenuEntry(null)
        }}
      >
        <MenuItem
          sx={{ color: 'error.main', fontSize: 14 }}
          onClick={() => {
            setMenuAnchor(null)
            setDeleteEntry(menuEntry)
            setDeleteModalOpen(true)
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          削除
        </MenuItem>
      </Menu>

      {/* サービス削除確認モーダル */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        serviceName={deleteEntry?.id?.split(',')[0].replace('/_service/', '')}
        isPro={deleteEntry ? getEnvType(deleteEntry) === 'pro' : false}
        onClose={() => {
          setDeleteModalOpen(false)
          setDeleteEntry(null)
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* プラン変更モーダル */}
      <PublicSettingsModal
        open={publicSettingsOpen}
        serviceName={selectedServiceName}
        currentEnv={selectedEnv}
        cancelAt={selectedCancelAt}
        onClose={() => setPublicSettingsOpen(false)}
        onEnvChanged={() => getService()}
        onUpgraded={() => {
          setPublicSettingsOpen(false)
          getService()
          setMesseage({ type: 'info', value: 'pro環境に変更しました。' })
          setTimeout(() => setMesseage(undefined), 10000)
        }}
      />
    </MainContainer>
  )
}

export default ServiceList
