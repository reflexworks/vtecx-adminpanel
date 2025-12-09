import React from 'react'
import MainContainer from '../../parts/Container'
import { Refresh } from '@mui/icons-material'
import {
  Tooltip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  Box
} from '@mui/material'
import CopyCommandMenu from '../../parts/CopyCommandMenu'
import useProperties from '../../../hooks/useProperties'
import { grey } from '@mui/material/colors'
import useAddUserMail from '../../../hooks/useAddUserMail'
import usePassresetMail from '../../../hooks/usePassresetMail'

const Properties = () => {
  const { get: getProperties, list: properties } = useProperties()
  const { get: getAddUserMail, data: add_user_mail } = useAddUserMail()
  const { get: getPassresetMail, data: passreset_mail } = usePassresetMail()
  return (
    <>
      <MainContainer
        title={'詳細設定'}
        action={
          <>
            <Tooltip title="Reload data" placement="top" enterDelay={1000}>
              <div>
                <IconButton size="small" aria-label="refresh" onClick={getProperties}>
                  <Refresh />
                </IconButton>
              </div>
            </Tooltip>
            <CopyCommandMenu
              menu={[
                { label: 'download', value: 'npx vtecxutil download:properties' },
                { label: 'upload', value: 'npx vtecxutil upload:properties' }
              ]}
            />
          </>
        }
      >
        <Box paddingBottom={2}>
          <Alert severity={'info'}>
            下記の内容を変更する場合は、
            <Typography
              color={grey[700]}
              sx={{ background: grey[100], borderRadius: 2, padding: 1 }}
              component={'span'}
              variant="body2"
            >
              setup/_settings/properties.xml
            </Typography>
            を編集してください。
          </Alert>
        </Box>

        <TableContainer component={Paper} hidden={properties && properties.length <= 0}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="left">キー</TableCell>
                <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                  値
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {properties &&
                properties.map((propertie: { key: string; value: string }, index: number) => {
                  const key = propertie.key
                  const value = propertie.value

                  return (
                    <TableRow hover key={key + index}>
                      <TableCell
                        align="left"
                        sx={{ display: { xs: 'table-cell', md: 'table-cell' } }}
                      >
                        <Typography variant="caption" color={grey[700]}>
                          {key}
                        </Typography>
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{ display: { xs: 'table-cell', md: 'table-cell' } }}
                      >
                        <Typography variant="caption" color={grey[700]}>
                          {value}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </MainContainer>
      <MainContainer
        title={'登録メール本文内容'}
        action={
          <>
            <Tooltip title="Reload data" placement="top" enterDelay={1000}>
              <div>
                <IconButton size="small" aria-label="refresh" onClick={getAddUserMail}>
                  <Refresh />
                </IconButton>
              </div>
            </Tooltip>
            <CopyCommandMenu
              menu={[
                { label: 'download', value: 'npx vtecxutil download:properties' },
                { label: 'upload', value: 'npx vtecxutil upload:properties' }
              ]}
            />
          </>
        }
      >
        <Box paddingBottom={2}>
          <Alert severity={'info'}>
            下記の内容を変更する場合は、
            <Typography
              color={grey[700]}
              sx={{ background: grey[100], borderRadius: 2, padding: 1 }}
              component={'span'}
              variant="body2"
            >
              setup/_settings/properties.xml
            </Typography>
            を編集してください。
          </Alert>
        </Box>
        <Box
          sx={{
            whiteSpace: 'pre',
            fontFamily: 'monospace',
            bgcolor: 'grey.50',
            p: 2,
            overflowX: 'auto',
            borderRadius: 1,
            fontSize: 12
          }}
        >
          {add_user_mail?.content?.______text}
        </Box>
      </MainContainer>
      <MainContainer
        title={'パスワード変更メール本文内容'}
        action={
          <>
            <Tooltip title="Reload data" placement="top" enterDelay={1000}>
              <div>
                <IconButton size="small" aria-label="refresh" onClick={getPassresetMail}>
                  <Refresh />
                </IconButton>
              </div>
            </Tooltip>
            <CopyCommandMenu
              menu={[
                { label: 'download', value: 'npx vtecxutil download:properties' },
                { label: 'upload', value: 'npx vtecxutil upload:properties' }
              ]}
            />
          </>
        }
      >
        <Box paddingBottom={2}>
          <Alert severity={'info'}>
            下記の内容を変更する場合は、
            <Typography
              color={grey[700]}
              sx={{ background: grey[100], borderRadius: 2, padding: 1 }}
              component={'span'}
              variant="body2"
            >
              setup/_settings/properties.xml
            </Typography>
            を編集してください。
          </Alert>
        </Box>
        <Box
          sx={{
            whiteSpace: 'pre',
            fontFamily: 'monospace',
            bgcolor: 'grey.50',
            p: 2,
            overflowX: 'auto',
            borderRadius: 1,
            fontSize: 12
          }}
        >
          {passreset_mail?.content?.______text}
        </Box>
      </MainContainer>
    </>
  )
}
export default Properties
