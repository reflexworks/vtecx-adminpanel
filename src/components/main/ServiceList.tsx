import React from 'react'
import { Add, Refresh } from '@mui/icons-material'
import {
  Stack,
  Tooltip,
  IconButton,
  Button,
  Box,
  Container,
  styled,
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
import VtecxApp from '../../typings'
import dayjs from 'dayjs'
import { Link } from 'react-router'
import { grey, lightGreen } from '@mui/material/colors'
import useService from '../../hooks/useService'
import AlertDialog from '../parts/Dialog'
import BasicModal from '../parts/Modal'
import validation, { ValidationProps } from '../../utils/validation'

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
  const {
    list,
    get: getService,
    post: createService,
    deleteService,
    error: service_error
  } = useService()
  const handleCreateClick = () => {
    setShowCreateModal(true)
  }

  const [show_create_modal, setShowCreateModal] = React.useState<boolean>(false)

  const PageContentHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing(2)
  }))

  const PageHeaderToolbar = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
    marginLeft: 'auto'
  }))

  const [entry, setEntry] = React.useState<VtecxApp.Entry[]>([])

  React.useEffect(() => {
    const sortedEntries = (list.length ? list : data.feed.entry).sort((a, b) => {
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
    console.log(service_error)
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
    <Container sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column' }}>
      <Stack sx={{ flex: 1, my: 2 }} spacing={2}>
        <Stack>
          <PageContentHeader>
            <Typography variant="h5">サービス一覧</Typography>
            <PageHeaderToolbar>
              <Stack direction="row" alignItems="right" spacing={1}>
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
              </Stack>
            </PageHeaderToolbar>
          </PageContentHeader>
        </Stack>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box paddingBottom={2} display={messeage ? 'block' : 'none'}>
            <Alert severity={messeage?.type}>{messeage?.value}</Alert>
          </Box>
          <Alert severity="info" sx={{ display: entry.length === 0 ? 'block' : 'none' }}>
            <AlertTitle>サービスを作成してください。</AlertTitle>
            「新規作成」ボタンからサービスを作成して開始してください。
          </Alert>
          <TableContainer component={Paper} hidden={entry.length === 0}>
            <Table aria-label="simple table">
              <TableHead>
                <TableRow>
                  <TableCell
                    align="center"
                    sx={{ display: { xs: 'table-cell', md: 'table-cell' } }}
                  >
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
                  const prop = status === 'production' ? 'https' : 'http'
                  const link = `${prop}://${service_name}.vte.cx`
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
                            label={status}
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
        </Box>
      </Stack>
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
    </Container>
  )
}
export default ServiceList

const data = {
  feed: {
    entry: [
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-contra-0-3-0,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-contra-0-3-0',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-contra-0-3-0',
            ___rel: 'alternate'
          }
        ],
        published: '2022-09-14T11:22:07.998+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2022-09-14T11:23:59.889+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-contra-admin-1,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-contra-admin-1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-contra-admin-1',
            ___rel: 'alternate'
          }
        ],
        published: '2022-03-07T15:17:50.958+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2022-03-07T15:17:53.031+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-contra-dev-1,7',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-1',
            ___rel: 'alternate'
          }
        ],
        published: '2022-02-05T23:12:45.497+09:00',
        rights: '41',
        subtitle: 'deleted',
        updated: '2023-01-05T12:56:11.527+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-contra-dev-2,7',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-2',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-2',
            ___rel: 'alternate'
          }
        ],
        published: '2022-02-22T15:22:00.516+09:00',
        rights: '41',
        subtitle: 'deleted',
        updated: '2023-01-05T12:56:05.591+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-contra-dev-3,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-3',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-3',
            ___rel: 'alternate'
          }
        ],
        published: '2022-03-11T13:19:58.398+09:00',
        rights: '41',
        subtitle: 'deleted',
        updated: '2023-01-05T12:56:27.887+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-contra-dev-4,7',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-4',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-4',
            ___rel: 'alternate'
          }
        ],
        published: '2022-04-18T15:13:40.692+09:00',
        rights: '41',
        subtitle: 'deleted',
        updated: '2023-01-05T12:56:00.074+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-contra-dev-5,7',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-5',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-5',
            ___rel: 'alternate'
          }
        ],
        published: '2022-05-31T15:26:37.354+09:00',
        rights: '41',
        subtitle: 'deleted',
        updated: '2023-01-05T12:55:54.191+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-contra-dev-6,7',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-6',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-6',
            ___rel: 'alternate'
          }
        ],
        published: '2022-06-27T14:35:56.950+09:00',
        rights: '41',
        subtitle: 'deleted',
        updated: '2023-01-05T12:55:47.785+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-contra-dev-7,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-7',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-7',
            ___rel: 'alternate'
          }
        ],
        published: '2022-06-30T15:49:26.094+09:00',
        rights: '41',
        subtitle: 'deleted',
        updated: '2023-01-05T12:56:35.634+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-contra-dev-8,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-8',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-contra-dev-8',
            ___rel: 'alternate'
          }
        ],
        published: '2022-08-08T23:59:18.589+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2022-08-09T00:00:37.512+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-fcmtest1,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-fcmtest1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-fcmtest1',
            ___rel: 'alternate'
          }
        ],
        published: '2022-03-07T10:52:28.958+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2022-03-07T10:52:30.583+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-fcmtest2,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-fcmtest2',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-fcmtest2',
            ___rel: 'alternate'
          }
        ],
        published: '2022-03-17T15:20:02.606+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2022-03-17T15:21:07.006+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-green-1,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-green-1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-green-1',
            ___rel: 'alternate'
          }
        ],
        published: '2022-03-25T13:22:11.865+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2022-03-25T13:22:12.955+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-green-2,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-green-2',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-green-2',
            ___rel: 'alternate'
          }
        ],
        published: '2022-03-25T15:27:01.440+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2022-03-25T15:27:02.131+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-green-3,13',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-green-3',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-green-3',
            ___rel: 'alternate'
          }
        ],
        published: '2022-03-28T18:17:31.119+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2022-03-29T14:41:49.856+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-ichibadx-dev-local-1,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev-local-1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev-local-1',
            ___rel: 'alternate'
          }
        ],
        published: '2023-11-17T12:20:08.225+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2023-11-17T12:20:09.718+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-ichibadx-dev1,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev1',
            ___rel: 'alternate'
          }
        ],
        published: '2023-07-03T10:29:59.418+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2023-08-30T16:56:54.481+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-ichibadx-dev2,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev2',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev2',
            ___rel: 'alternate'
          }
        ],
        published: '2023-08-31T13:53:15.591+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2023-08-31T13:53:17.136+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-ichibadx-dev3,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev3',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev3',
            ___rel: 'alternate'
          }
        ],
        published: '2023-09-05T18:16:22.625+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2023-09-05T18:16:37.269+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-ichibadx-dev4,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev4',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev4',
            ___rel: 'alternate'
          }
        ],
        published: '2023-10-25T17:50:45.392+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2023-10-25T17:52:13.725+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-ichibadx-dev5,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev5',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-ichibadx-dev5',
            ___rel: 'alternate'
          }
        ],
        published: '2024-03-11T10:43:19.305+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2024-03-11T10:51:25.348+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-naikakufuapp-dev--1,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-naikakufuapp-dev--1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-naikakufuapp-dev--1',
            ___rel: 'alternate'
          }
        ],
        published: '2024-08-21T15:27:46.640+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2024-08-21T15:29:25.295+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-naikakufuapp-dev-2,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-naikakufuapp-dev-2',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-naikakufuapp-dev-2',
            ___rel: 'alternate'
          }
        ],
        published: '2024-09-13T16:54:18.296+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2024-09-13T16:55:36.246+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-naikakufuapp-dev-3,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-naikakufuapp-dev-3',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-naikakufuapp-dev-3',
            ___rel: 'alternate'
          }
        ],
        published: '2024-09-27T16:34:13.888+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2024-09-27T16:35:53.000+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-naikakufuapp-dev-jest1,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-naikakufuapp-dev-jest1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-naikakufuapp-dev-jest1',
            ___rel: 'alternate'
          }
        ],
        published: '2025-01-08T15:05:16.260+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2025-01-08T15:06:34.783+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-nextjs-test,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-nextjs-test',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-nextjs-test',
            ___rel: 'alternate'
          }
        ],
        published: '2023-07-27T22:32:22.759+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2023-07-27T22:32:24.003+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-nhk-dev-1,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-nhk-dev-1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-nhk-dev-1',
            ___rel: 'alternate'
          }
        ],
        published: '2023-06-02T14:42:57.449+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2023-06-02T14:42:58.229+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-tofservice-dev-1,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-tofservice-dev-1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-tofservice-dev-1',
            ___rel: 'alternate'
          }
        ],
        published: '2023-01-05T12:54:58.674+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2023-01-17T18:09:21.162+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-vtecadmin,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-vtecadmin',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-vtecadmin',
            ___rel: 'alternate'
          }
        ],
        published: '2023-08-16T16:46:09.826+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2023-08-16T16:46:10.752+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-vtecx-adminpanel-test1,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-vtecx-adminpanel-test1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-vtecx-adminpanel-test1',
            ___rel: 'alternate'
          }
        ],
        published: '2025-11-06T12:44:55.371+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2025-11-06T12:44:57.634+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-vtecxadmin-test-1,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-vtecxadmin-test-1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-vtecxadmin-test-1',
            ___rel: 'alternate'
          }
        ],
        published: '2022-04-05T11:18:40.377+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2022-04-05T11:18:41.768+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-vtecxadmin-test-2,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-vtecxadmin-test-2',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-vtecxadmin-test-2',
            ___rel: 'alternate'
          }
        ],
        published: '2025-03-18T15:36:23.369+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2025-03-18T15:42:54.004+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:41'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-vtecxblank-test-1,3',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-vtecxblank-test-1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-vtecxblank-test-1',
            ___rel: 'alternate'
          }
        ],
        published: '2022-04-05T16:35:06.448+09:00',
        rights: '41',
        subtitle: 'staging',
        updated: '2022-04-05T16:35:08.144+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-vtecxec-dev,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-vtecxec-dev',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-vtecxec-dev',
            ___rel: 'alternate'
          }
        ],
        published: '2023-04-05T12:18:20.510+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2023-04-05T12:18:49.571+09:00'
      },
      {
        author: [
          {
            uri: 'urn:vte.cx:created:41'
          },
          {
            uri: 'urn:vte.cx:updated:0'
          }
        ],
        contributor: [
          {
            uri: 'urn:vte.cx:acl:/_group/$admin,CRUD'
          },
          {
            uri: 'urn:vte.cx:acl:41,R'
          }
        ],
        id: '/_service/work-takeyama-wiz-dev-1,5',
        link: [
          {
            ___href: '/_user/41/service/work-takeyama-wiz-dev-1',
            ___rel: 'self'
          },
          {
            ___href: '/_user/41/service/work-takeyama-wiz-dev-1',
            ___rel: 'alternate'
          }
        ],
        published: '2023-02-28T14:34:24.870+09:00',
        rights: '41',
        subtitle: 'production',
        updated: '2023-02-28T17:00:43.221+09:00'
      }
    ]
  }
}
