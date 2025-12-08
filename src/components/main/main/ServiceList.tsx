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
  TextField
} from '@mui/material'
import VtecxApp from '../../../typings'
import dayjs from 'dayjs'
import { Link } from 'react-router'
import { grey, lightGreen } from '@mui/material/colors'
import useService from '../../../hooks/useService'
import AlertDialog from '../../parts/Dialog'
import BasicModal from '../../parts/Modal'
import validation, { ValidationProps } from '../../../utils/validation'
import MainContainer from '../../parts/Container'

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
    <BasicModal open={open} handleClose={handleClose}>
      <Typography variant="h6">サービス新規作成</Typography>
      <Box paddingTop={5}>
        <TextField
          label="サービス名"
          slotProps={{
            inputLabel: {
              shrink: true
            }
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

        <Typography
          variant="caption"
          sx={{ display: success.error ? 'block' : undefined }}
          paddingTop={2}
          color={'error'}
        >
          {success.message}
        </Typography>

        <Box paddingTop={2}>
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
            onClick={handleCreateService}
            startIcon={<Add />}
            disabled={success.error}
          >
            新規作成
          </Button>
        </Box>
      </Box>
    </BasicModal>
  )
}

const ServiceList = () => {
  const { list, get: getService, post: createService, deleteService } = useService()
  const handleCreateClick = () => {
    setShowCreateModal(true)
  }

  const [show_create_modal, setShowCreateModal] = React.useState<boolean>(false)

  const [entry, setEntry] = React.useState<VtecxApp.Entry[]>([])

  React.useEffect(() => {
    const sortedEntries = (list.length ? list : []).sort((a, b) => {
      const isAProduction = a.subtitle === 'production'
      const isBProduction = b.subtitle === 'production'

      if (isAProduction && !isBProduction) {
        return -1
      }
      if (!isAProduction && isBProduction) {
        return 1
      }

      const dateA = new Date(a.published)
      const dateB = new Date(b.published)

      return dateB.getTime() - dateA.getTime()
    })
    setEntry(sortedEntries)
  }, [list])

  const [dialog, setDialog] = React.useState<boolean>(false)
  const [delete_service_name, setDeleteServiceName] = React.useState<string | undefined>()
  const [messeage, setMesseage] = React.useState<
    { type: 'info' | 'error'; value: string } | undefined
  >()

  const afterCreateService = React.useCallback((success: boolean | undefined) => {
    if (success) {
      setMesseage({ type: 'info', value: `サービス作成を作成しました。` })
      setTimeout(() => {
        setMesseage(undefined)
      }, 10000)
    } else {
      setMesseage({ type: 'error', value: 'サービス作成に失敗しました。もう一度お試しください。' })
    }
  }, [])

  const afterDeleteService = React.useCallback(async () => {
    const success = await deleteService(delete_service_name)
    if (success) {
      setMesseage({ type: 'info', value: `${delete_service_name}の削除しました。` })
      setTimeout(() => {
        setMesseage(undefined)
      }, 10000)
    } else {
      setMesseage({ type: 'error', value: `${delete_service_name}の削除に失敗しました。` })
    }
    setDialog(false)
  }, [])

  return (
    <MainContainer
      title={'サービス一覧'}
      action={
        <>
          <Tooltip title="Reload data" placement="right" enterDelay={1000}>
            <div>
              <IconButton size="small" aria-label="refresh" onClick={getService}>
                <Refresh />
              </IconButton>
            </div>
          </Tooltip>
          <Button variant="contained" onClick={handleCreateClick} startIcon={<Add />}>
            新規作成
          </Button>
          <CreateServiceModal
            open={show_create_modal}
            handleClose={() => {
              setShowCreateModal(false)
            }}
            createService={createService}
            afterCreateService={afterCreateService}
          />
        </>
      }
    >
      <Box paddingBottom={2} display={messeage ? 'block' : 'none'}>
        <Alert severity={messeage?.type}>{messeage?.value}</Alert>
      </Box>
      <Alert severity="info" sx={{ display: entry.length === 0 ? 'block' : 'none' }}>
        <AlertTitle>サービスを作成してください。</AlertTitle>
        「新規作成」ボタンからサービスを作成して開始してください。
      </Alert>
      <TableContainer component={Paper} hidden={entry.length === 0}>
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
              <TableCell
                align="right"
                sx={{ display: { xs: 'none', md: 'table-cell' } }}
              ></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entry.map((entry: VtecxApp.Entry) => {
              const service_name = entry.id && entry.id.split(',')[0].replace('/_service/', '')
              const status = entry.subtitle
              const published = dayjs(entry.published).format('YYYY/MM/DD HH:mm:ss')
              const link = `https://${service_name}.vte.cx`
              return (
                status !== 'deleted' && (
                  <TableRow
                    key={entry.id}
                    sx={{
                      '&:last-child td, &:last-child th': { border: 0 },
                      backgroundColor: status === 'production' ? lightGreen[50] : undefined, // 薄い青 (MUIのblue.50)

                      // hover時に適用されるスタイル
                      '&:hover': {
                        // ホバー時に少し濃い色にすることで、効果を強調
                        backgroundColor: status === 'production' ? lightGreen[100] : grey[100] // 薄い青より少し濃い色 (MUIのblue.100)
                      }
                    }}
                  >
                    <TableCell
                      align="center"
                      sx={{ display: { xs: 'table-cell', md: 'table-cell' } }}
                    >
                      <Chip
                        label={status === 'production' ? 'Pro' : 'Free'}
                        variant={status === 'production' ? undefined : 'outlined'}
                        color={status === 'production' ? 'success' : undefined}
                      />
                    </TableCell>
                    <TableCell component="th" scope="row">
                      <Typography
                        variant="body2"
                        component={'div'}
                        sx={{
                          overflowWrap: 'break-word',
                          wordWrap: 'break-word',
                          maxWidth: {
                            xs: '300px',
                            md: '500px'
                          }
                        }}
                        gutterBottom
                      >
                        {service_name}
                      </Typography>
                      <Link to={`${link}`} target="_blank">
                        <Typography
                          variant="caption"
                          sx={{
                            overflowWrap: 'break-word',
                            wordWrap: 'break-word',
                            maxWidth: {
                              xs: '300px',
                              md: '500px'
                            }
                          }}
                          color={status === 'production' ? 'success' : grey[700]}
                        >
                          {link}
                        </Typography>
                      </Link>
                    </TableCell>
                    <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2" color={grey[700]}>
                        {published}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Button
                        onClick={() => {
                          location.href = `/d/@/admin.html?_login=${service_name}`
                        }}
                      >
                        管理画面
                      </Button>
                      <Button
                        color="error"
                        onClick={async () => {
                          setMesseage(undefined)
                          setDeleteServiceName(service_name)
                          setDialog(true)
                        }}
                      >
                        削除
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <AlertDialog
        title={`${delete_service_name}を削除しますか？`}
        open={dialog}
        onAgree={afterDeleteService}
        handleClose={() => {
          setDialog(false)
        }}
      >
        サービス削除後は復旧することはできません。
      </AlertDialog>
    </MainContainer>
  )
}
export default ServiceList
