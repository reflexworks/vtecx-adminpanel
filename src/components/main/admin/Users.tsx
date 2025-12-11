import React from 'react'
import MainContainer from '../../parts/Container'
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
  useTheme,
  Chip,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup
} from '@mui/material'
import VtecxApp from '../../../typings'
import dayjs from 'dayjs'
import { green, grey } from '@mui/material/colors'
import {
  Edit,
  KeyboardArrowDown,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Refresh
} from '@mui/icons-material'
import useUsers from '../../../hooks/useUsers'
import BasicModal from '../../parts/Modal'

const ChangeStatusModal = ({
  open,
  handleClose,
  deleteUser,
  revokeUser,
  activateUser,
  afterChange,
  user
}: {
  open: boolean
  handleClose: () => void
  deleteUser: ({ account }: { account: string }) => Promise<boolean | undefined>
  revokeUser: ({ account }: { account: string }) => Promise<boolean | undefined>
  activateUser: ({ account }: { account: string }) => Promise<boolean | undefined>
  afterChange: (success: boolean | undefined) => void
  user?: { account: string; status: string; value: string | undefined }
}) => {
  const [type, setType] = React.useState<string | undefined>()
  const handleChange = React.useCallback(async () => {
    if (user && user.value) {
      let success
      if (type === 'delete') {
        success = await deleteUser({ account: user.value })
      }
      if (type === 'revokeuser') {
        success = await revokeUser({ account: user.value })
      }
      if (type === 'activateuser') {
        success = await activateUser({ account: user.value })
      }
      afterChange(success)
    }
    handleClose()
  }, [user?.status, user?.value, type])

  const margin = 4

  return (
    <BasicModal open={open} handleClose={handleClose}>
      <Typography variant="h6">ステータス変更</Typography>
      <Box paddingTop={5} component={'form'} noValidate autoComplete="off">
        <FormControl>
          <FormLabel>{user?.account}のステータス変更</FormLabel>
          <RadioGroup
            row
            name="stetus_type"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setType(e.target.value)
            }}
          >
            <FormControlLabel value="delete" control={<Radio />} label="削除" />
            {user?.status === 'Activated' && (
              <FormControlLabel value="revokeuser" control={<Radio />} label="無効" />
            )}
            {user?.status === 'Revoked' && (
              <FormControlLabel value="activateuser" control={<Radio />} label="有効" />
            )}
          </RadioGroup>
        </FormControl>
        <Box paddingBottom={2} display={type ? 'block' : 'none'}>
          <Alert severity={type === 'delete' ? 'error' : 'info'}>
            {type === 'delete' && '削除したユーザのデータは復元できません。よろしいでしょうか？'}
            {type === 'revokeuser' &&
              'このアカウントを無効にしログインできなくします。よろしいでしょうか？'}
            {type === 'activateuser' &&
              'このアカウントを有効にしログインを可能にします。よろしいでしょうか？'}
          </Alert>
        </Box>
        <Box paddingTop={margin}>
          <Button
            color="inherit"
            variant="outlined"
            onClick={handleClose}
            style={{ marginRight: '15px' }}
          >
            キャンセル
          </Button>
          <Button
            color="success"
            variant="contained"
            onClick={handleChange}
            startIcon={<Edit />}
            disabled={!type}
          >
            適用
          </Button>
        </Box>
      </Box>
    </BasicModal>
  )
}

const Users = () => {
  const theme = useTheme()
  const {
    list: user_list,
    get: getUserList,
    deleteUser,
    revokeUser,
    activateUser,
    error: user_error,
    count: user_count,
    status_color,
    status_label,
    admin_user
  } = useUsers()

  const [select_account, setSelectAccount] = React.useState<
    { account: string; status: string; value: string | undefined } | undefined
  >()
  const [page, setPage] = React.useState<number>(1)
  const [page_count] = React.useState<number>(50)
  const [show_change_modal, setShowChangeModal] = React.useState<boolean>(false)
  const [messeage, setMesseage] = React.useState<
    { type: 'info' | 'error'; value: string } | undefined
  >()

  React.useEffect(() => {
    getUserList({ page: page, page_count: page_count })
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

  const afterChange = React.useCallback(
    (success: boolean | undefined) => {
      if (success) {
        getUserList({ page: page, page_count: page_count })
        setMesseage({ type: 'info', value: `ステータスを更新しました。` })
        setTimeout(() => {
          setMesseage(undefined)
        }, 10000)
      } else {
        setMesseage({
          type: 'error',
          value: `ステータスの更新に失敗しました。もう一度お試しください。`
        })
      }
    },
    [page, page_count]
  )

  return (
    <MainContainer
      title={'ユーザ管理'}
      action={
        <>
          <Tooltip title="Reload data" placement="right" enterDelay={1000}>
            <div>
              <IconButton
                size="small"
                aria-label="refresh"
                onClick={() => {
                  getUserList({ page: 1, page_count: 50 })
                }}
              >
                <Refresh />
              </IconButton>
            </div>
          </Tooltip>
          <ChangeStatusModal
            open={show_change_modal}
            handleClose={() => {
              setShowChangeModal(false)
            }}
            deleteUser={deleteUser}
            revokeUser={revokeUser}
            activateUser={activateUser}
            afterChange={afterChange}
            user={select_account}
          />
        </>
      }
    >
      <Box paddingBottom={2} display={messeage ? 'block' : 'none'}>
        <Alert severity={messeage?.type}>{messeage?.value}</Alert>
      </Box>
      <Box paddingBottom={2} display={user_error ? 'block' : 'none'}>
        <Alert severity={'error'}>{user_error?.response?.data.feed.title}</Alert>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="caption">ACL権限</Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="caption" component={'div'}>
                  UID
                </Typography>
                <Typography variant="caption">アカウント</Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="caption">状態</Typography>
              </TableCell>
              <TableCell align="left">
                <Typography variant="caption" component={'div'}>
                  登録日
                </Typography>
                <Typography variant="caption">更新日</Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {user_list.map((entry: VtecxApp.Entry) => {
              const endPoint: string =
                entry && entry.link && entry.link[0] && entry.link[0].___href
                  ? entry.link[0].___href
                  : ''
              const uid = endPoint.replace('/_user/', '')
              const status = entry.summary
              let account = entry.title
              if (entry.contributor) {
                entry.contributor.map(contributor => {
                  if (contributor.email) account = contributor.email
                })
              }
              const is_admin = Boolean(admin_user[uid])
              return (
                <TableRow key={entry.id} hover>
                  <TableCell align="left">
                    <Typography variant="caption" color={is_admin ? green[800] : grey[800]}>
                      {is_admin ? '管理者' : '一般ユーザ'}
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="caption" color={grey[700]} component={'div'}>
                      {uid}
                    </Typography>
                    <Typography variant="caption">{account}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="caption" color={grey[800]}>
                      <Chip
                        label={status ? status_label[status] : undefined}
                        color={status ? status_color[status] : undefined}
                        onDelete={() => {
                          if (account && status) {
                            setSelectAccount({ account, status, value: entry.title })
                            setShowChangeModal(true)
                          }
                        }}
                        deleteIcon={<KeyboardArrowDown />}
                      />
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="caption" color={grey[700]} component={'div'}>
                      {dayjs(entry.published).format('YYYY/MM/DD HH:mm:ss')}
                    </Typography>
                    <Typography variant="caption">
                      {dayjs(entry.updated).format('YYYY/MM/DD HH:mm:ss')}
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

          display: user_count ? 'flex' : 'none',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: theme.spacing(2)
        }}
      >
        <Typography variant="body2" color="inherit">
          {user_count}
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
            disabled={user_count ? parseInt(user_count) / page_count <= page : true}
          >
            <KeyboardArrowRight />
          </IconButton>
        </Box>
      </Box>
    </MainContainer>
  )
}
export default Users
