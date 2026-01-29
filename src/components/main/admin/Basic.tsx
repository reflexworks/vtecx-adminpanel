import React from 'react'
import { Box, Typography, InputAdornment, OutlinedInput, Button, Alert } from '@mui/material'
import OutlinedCard from '../../parts/Card'
import CopyableDisplay from '../../parts/CopyableDisplay'
import { Link } from 'react-router'
import MainContainer from '../../parts/Container'
import useAdmin from '../../../hooks/useAdmin'
import AlertDialog from '../../parts/Dialog'

const Basic = () => {
  const { getAccesstoken, updateAccesstoken, accesstoken, getAPIKey, updateAPIKey, apikey, error } =
    useAdmin()

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
  }, [])

  return (
    <MainContainer title={'基本情報'}>
      <Box paddingBottom={2} display={error ? 'block' : 'none'}>
        <Alert severity={'error'}>{error?.response?.data?.feed.title}</Alert>
      </Box>
      <Box paddingBottom={2} display={messeage ? 'block' : 'none'}>
        <Alert severity={messeage?.type}>{messeage?.value}</Alert>
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
          />
        </OutlinedCard>
      </Box>
      <Box paddingBottom={3}>
        <OutlinedCard title={'APIKEY'}>
          <CopyableDisplay value={apikey} />
          <Button
            color={'success'}
            variant="contained"
            style={{ marginTop: '10px' }}
            onClick={() => {
              setApikeyDialog(true)
            }}
          >
            APIKEYの更新
          </Button>
        </OutlinedCard>
      </Box>
      <Box paddingBottom={3}>
        <OutlinedCard title={'アクセストークン'}>
          <CopyableDisplay value={accesstoken} />
          <Button
            color={'success'}
            variant="contained"
            style={{ marginTop: '10px' }}
            onClick={() => {
              setTokenDialog(true)
            }}
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
