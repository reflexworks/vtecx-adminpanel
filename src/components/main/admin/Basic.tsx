import React from 'react'
import {
  Box,
  Typography,
  InputAdornment,
  OutlinedInput,
  Button,
  Alert,
  Card,
  CardContent,
  Grid2 as Grid
} from '@mui/material'
import OutlinedCard from '../../parts/Card'
import CopyableDisplay from '../../parts/CopyableDisplay'
import { Link } from 'react-router'
import MainContainer from '../../parts/Container'
import useAdmin from '../../../hooks/useAdmin'
import AlertDialog from '../../parts/Dialog'
import { WarningAmber } from '@mui/icons-material'

/**
 * バイト数を読みやすい単位に変換する
 */
const formatBytes = (bytesStr: string | undefined): string => {
  if (!bytesStr) return '-'
  const bytes = parseFloat(bytesStr)
  if (isNaN(bytes)) return bytesStr
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value % 1 === 0 ? value : value.toFixed(2)} ${units[i]}`
}

/**
 * 数値を3桁カンマ区切りにフォーマットする
 */
const formatNumber = (numStr: string | undefined): string => {
  if (!numStr) return '-'
  const num = parseInt(numStr, 10)
  if (isNaN(num)) return numStr
  return num.toLocaleString('ja-JP')
}

const Basic = () => {
  const {
    getAccesstoken,
    updateAccesstoken,
    accesstoken,
    getAPIKey,
    updateAPIKey,
    apikey,
    error,
    accessCount,
    getAccessCount,
    accessCountError,
    storageUsage,
    getStorageUsage,
    storageUsageError
  } = useAdmin()

  const [protocol] = React.useState(location.protocol)
  const [service_name] = React.useState(location.host.replace('.vte.cx', ''))

  const [token_dialog, setTokenDialog] = React.useState<boolean>(false)
  const [apikey_dialog, setApikeyDialog] = React.useState<boolean>(false)

  const [messeage, setMesseage] = React.useState<
    { type: 'info' | 'error'; value: string } | undefined
  >()

  const updateToken = React.useCallback(async () => {
    setTokenDialog(false)
    const res = await updateAccesstoken()
    if (res) {
      setMesseage({ type: 'info', value: `アクセストークンの更新を行いました。` })
    }
  }, [])

  const updateKey = React.useCallback(async () => {
    setApikeyDialog(false)
    const res = await updateAPIKey()
    if (res) {
      setMesseage({ type: 'info', value: `APIKEYの更新を行いました。` })
    }
  }, [])

  React.useEffect(() => {
    getAccesstoken()
    getAPIKey()
    getAccessCount()
    getStorageUsage()
  }, [])

  const isAccessCountLimitExceeded = accessCountError?.response?.status === 402
  const isStorageUsageLimitExceeded = storageUsageError?.response?.status === 402

  return (
    <MainContainer title={'基本情報'}>
      <Box paddingBottom={2} display={error ? 'block' : 'none'}>
        <Alert severity={'error'}>{error?.response?.data?.feed.title}</Alert>
      </Box>
      <Box paddingBottom={2} display={messeage ? 'block' : 'none'}>
        <Alert severity={messeage?.type} data-testid="success-alert">
          {messeage?.value}
        </Alert>
      </Box>

      {/* アクセスカウンタ＆データ使用量 */}
      <Box paddingBottom={3}>
        <Grid container spacing={2}>
          {/* アクセスカウンタ */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderColor: isAccessCountLimitExceeded ? 'error.main' : undefined,
                borderWidth: isAccessCountLimitExceeded ? 2 : undefined
              }}
              data-testid="access-count-card"
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} marginBottom={1}>
                  {isAccessCountLimitExceeded && <WarningAmber color="error" />}
                  <Typography
                    variant="h6"
                    component="div"
                    color={isAccessCountLimitExceeded ? 'error' : undefined}
                  >
                    アクセスカウンタ
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="div"
                  marginBottom={2}
                >
                  今月のアクセス使用数
                </Typography>

                {isAccessCountLimitExceeded ? (
                  <Box data-testid="access-count-limit-error">
                    <Alert severity="error" sx={{ mb: 1 }}>
                      アクセス数の上限に達しました。サービスへのアクセスが制限されています。
                    </Alert>
                    <Typography variant="caption" color="error">
                      有償プランへのアップグレードをご検討ください。
                    </Typography>
                  </Box>
                ) : accessCountError ? (
                  <Box data-testid="access-count-error">
                    <Alert severity="warning">アクセスカウンタの取得に失敗しました。</Alert>
                  </Box>
                ) : (
                  <Box display="flex" alignItems="baseline" gap={0.5}>
                    <Typography
                      variant="h5"
                      fontWeight="bold"
                      color="primary"
                      data-testid="access-count-value"
                    >
                      {formatNumber(accessCount)}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      件
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* データ使用量 */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card
              variant="outlined"
              sx={{
                height: '100%',
                borderColor: isStorageUsageLimitExceeded ? 'error.main' : undefined,
                borderWidth: isStorageUsageLimitExceeded ? 2 : undefined
              }}
              data-testid="storage-usage-card"
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} marginBottom={1}>
                  {isStorageUsageLimitExceeded && <WarningAmber color="error" />}
                  <Typography
                    variant="h6"
                    component="div"
                    color={isStorageUsageLimitExceeded ? 'error' : undefined}
                  >
                    データ使用量
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="div"
                  marginBottom={2}
                >
                  現在のストレージ使用量
                </Typography>

                {isStorageUsageLimitExceeded ? (
                  <Box data-testid="storage-usage-limit-error">
                    <Alert severity="error" sx={{ mb: 1 }}>
                      ストレージの上限に達しました。データの書き込みが制限されています。
                    </Alert>
                    <Typography variant="caption" color="error">
                      有償プランへのアップグレードをご検討ください。
                    </Typography>
                  </Box>
                ) : storageUsageError ? (
                  <Box data-testid="storage-usage-error">
                    <Alert severity="warning">データ使用量の取得に失敗しました。</Alert>
                  </Box>
                ) : (
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="secondary"
                    data-testid="storage-usage-value"
                  >
                    {formatBytes(storageUsage)}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box paddingBottom={3}>
        <OutlinedCard
          title={'サービス名'}
          action={
            <Box paddingLeft={2} paddingBottom={2}>
              <Typography variant="body2">
                <Link
                  to={`${protocol}//${service_name}.vte.cx`}
                >{`${protocol}//${service_name}.vte.cx`}</Link>
              </Typography>
            </Box>
          }
        >
          <OutlinedInput
            fullWidth
            startAdornment={<InputAdornment position="start">{`${protocol}//`}</InputAdornment>}
            endAdornment={<InputAdornment position="end">vte.cx</InputAdornment>}
            value={service_name}
            readOnly
            sx={{ sm: '100%' }}
            data-testid="service-name"
          />
        </OutlinedCard>
      </Box>
      <Box paddingBottom={3}>
        <OutlinedCard title={'APIKEY'}>
          <CopyableDisplay value={apikey} data-testid="copy-apikey-button" />
          <Button
            color={'success'}
            variant="contained"
            style={{ marginTop: '10px' }}
            onClick={() => {
              setApikeyDialog(true)
            }}
            data-testid="update-apikey-button"
          >
            APIKEYの更新
          </Button>
        </OutlinedCard>
      </Box>
      <Box paddingBottom={3}>
        <OutlinedCard title={'アクセストークン'}>
          <CopyableDisplay value={accesstoken} data-testid="copy-token-button" />
          <Button
            color={'success'}
            variant="contained"
            style={{ marginTop: '10px' }}
            onClick={() => {
              setTokenDialog(true)
            }}
            data-testid="update-token-button"
          >
            アクセストークンの更新
          </Button>
        </OutlinedCard>
      </Box>

      <AlertDialog
        title={`アクセストークンの更新を行います`}
        open={token_dialog}
        onAgree={updateToken}
        handleClose={() => {
          setTokenDialog(false)
        }}
        color="error"
        data-testid="update-token-dialog"
        cancelTestId="update-token-cancel"
        okTestId="dialog-ok-button"
      >
        <Typography component={'span'}>
          更新すると、これまで
          <Typography color={'error'} component={'span'}>
            動作していたアプリケーションがすべて動作しなくなります。
          </Typography>
          本当によろしいですか？
        </Typography>
      </AlertDialog>
      <AlertDialog
        title={`APIKEYの更新を行います`}
        open={apikey_dialog}
        onAgree={updateKey}
        handleClose={() => {
          setApikeyDialog(false)
        }}
        color="error"
        data-testid="update-apikey-dialog"
        cancelTestId="update-apikey-cancel"
        okTestId="dialog-ok-button"
      >
        <Typography component={'span'}>
          更新すると、これまで
          <Typography color={'error'} component={'span'}>
            動作していたアプリケーションがすべて動作しなくなります。
          </Typography>
          本当によろしいですか？
        </Typography>
      </AlertDialog>
    </MainContainer>
  )
}
export default Basic
