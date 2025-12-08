import React from 'react'
import MainContainer from '../../parts/Container'
import useLog from '../../../hooks/useLog'
import {
  Box,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material'
import VtecxApp from '../../../typings'
import dayjs from 'dayjs'
import { grey, red } from '@mui/material/colors'
import { KeyboardArrowLeft, KeyboardArrowRight, Refresh } from '@mui/icons-material'

const Log = () => {
  const theme = useTheme()
  const { list: log_list, get: getLogList, error: log_error, count: log_count } = useLog()
  const [page, setPage] = React.useState<number>(1)
  const [page_count] = React.useState<number>(50)

  React.useEffect(() => {
    getLogList({ page: page, page_count: page_count })
  }, [page, page_count])

  const prevCount = React.useCallback(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
    setPage(page - 1)
  }, [page])

  const nextCount = React.useCallback(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    })
    setPage(page + 1)
  }, [page])

  return (
    <MainContainer
      title={'ログ'}
      action={
        <Tooltip title="Reload data" placement="right" enterDelay={1000}>
          <div>
            <IconButton
              size="small"
              aria-label="refresh"
              onClick={() => {
                getLogList({ page: 1, page_count: 50 })
              }}
            >
              <Refresh />
            </IconButton>
          </div>
        </Tooltip>
      }
    >
      <Box paddingBottom={2} display={log_error ? 'block' : 'none'}>
        <Alert severity={'error'}>{log_error?.response?.data.feed.title}</Alert>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="caption">日時</Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="caption">レベル</Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="caption">コンポーネント</Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="caption">内容</Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="caption">詳細</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {log_list.map((entry: VtecxApp.Entry) => {
              const level = entry.subtitle
              const color =
                level === 'ERROR'
                  ? 'error'
                  : level === 'WARN'
                    ? 'warning'
                    : level === 'INFO'
                      ? 'info'
                      : undefined
              return (
                <TableRow
                  key={entry.id}
                  sx={{
                    '&:last-child td, &:last-child th': { border: 0 },
                    background: level === 'ERROR' ? red[50] : undefined
                  }}
                  hover
                >
                  <TableCell component="th" scope="row">
                    <Typography variant="caption" color={grey[800]}>
                      {dayjs(entry.published).format('YYYY/MM/DD HH:mm:ss')}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="caption" color={color} fontWeight={'bold'}>
                      {level}
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="caption" color={grey[800]}>
                      {entry.title}
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="caption" color={grey[800]}>
                      {entry.summary}
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="caption" color={grey[800]}>
                      {entry.rights}
                    </Typography>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box
        sx={{
          borderRadius: 1,
          padding: theme.spacing(1),

          display: log_count ? 'flex' : 'none',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: theme.spacing(2)
        }}
      >
        <Typography variant="body2" color="inherit">
          {log_count}
        </Typography>

        <Typography variant="body2" color="inherit">
          件
        </Typography>

        <Box sx={{ display: 'flex' }}>
          <IconButton size="small" onClick={prevCount} disabled={page === 1}>
            <KeyboardArrowLeft />
          </IconButton>

          <IconButton
            size="small"
            onClick={nextCount}
            disabled={log_count ? parseInt(log_count) / page_count <= page : true}
          >
            <KeyboardArrowRight />
          </IconButton>
        </Box>
      </Box>
    </MainContainer>
  )
}
export default Log
