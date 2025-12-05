import React from 'react'
import { Box, Typography, InputAdornment, OutlinedInput } from '@mui/material'
import OutlinedCard from '../../parts/Card'
import CopyableDisplay from '../../parts/CopyableDisplay'
import { Link } from 'react-router'
import MainContainer from '../../parts/Container'
import useAdmin from '../../../hooks/useAdmin'

const Basic = () => {
  const { getAccesstoken, accesstoken, getAPIKey, apikey } = useAdmin()

  const [protocol] = React.useState(location.protocol)
  const [service_name] = React.useState(location.host.replace('.vte.cx', ''))

  React.useEffect(() => {
    getAccesstoken()
    getAPIKey()
  }, [])

  return (
    <MainContainer title={'基本情報'}>
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
        </OutlinedCard>
      </Box>
      <Box paddingBottom={3}>
        <OutlinedCard title={'アクセストークン'}>
          <CopyableDisplay value={accesstoken} />
        </OutlinedCard>
      </Box>
    </MainContainer>
  )
}
export default Basic
