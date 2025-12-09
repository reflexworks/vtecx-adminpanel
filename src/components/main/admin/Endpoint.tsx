import React from 'react'
import MainContainer from '../../parts/Container'
import { Add, Edit, Refresh } from '@mui/icons-material'
import {
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'
import validation, { ValidationProps } from '../../../utils/validation'
import BasicModal from '../../parts/Modal'
import { grey } from '@mui/material/colors'
import AlertDialog from '../../parts/Dialog'
import useEndpoint from '../../../hooks/useEndpoint'
import VtecxApp from '../../../typings'
import CopyCommandMenu from '../../parts/CopyCommandMenu'

const CreateModal = ({
  open,
  handleClose,
  create,
  afterCreate,
  entry
}: {
  open: boolean
  handleClose: () => void
  create: ({
    name,
    name_jp,
    summary,
    other
  }: {
    name: string
    name_jp?: string
    summary?: string
    other?: string
  }) => Promise<boolean | undefined>
  afterCreate: (success: boolean | undefined) => void
  entry?: VtecxApp.Entry
}) => {
  const [create_name, setCreateName] = React.useState<string | undefined>(
    entry?.id?.split(',')[0].replace('/', '') || ''
  )
  const [name_jp, setNameJp] = React.useState<string | undefined>(entry?.title || '')
  const [summary, setSummary] = React.useState<string | undefined>(entry?.content?.______text || '')
  const [other, setOther] = React.useState<string | undefined>(entry?.summary || '')
  const handleCreate = React.useCallback(async () => {
    if (create_name) {
      const success = await create({
        name: create_name,
        name_jp,
        summary,
        other
      })
      afterCreate(success)
      handleClose()
    }
  }, [create_name, name_jp, summary, other])

  const [success, setSuccess] = React.useState<ValidationProps>({
    error: Boolean(entry) ? false : true,
    message: ''
  })

  const margin = 4

  return (
    <BasicModal open={open} handleClose={handleClose}>
      <Typography variant="h6">エンドポイント新規作成</Typography>
      <Box paddingTop={5} component={'form'} noValidate autoComplete="off">
        <TextField
          label="エンドポイント"
          slotProps={{
            inputLabel: {
              shrink: true
            }
          }}
          fullWidth
          value={create_name}
          placeholder="半角英数とアンダーバー(_)が使用可能です。"
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setSuccess(validation('endpoint', e.target.value))
            setCreateName(e.target.value)
          }}
          onBlur={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setCreateName(e.target.value)
          }}
          error={Boolean(entry) ? false : success.error}
          disabled={Boolean(entry)}
        />

        <Typography
          variant="caption"
          sx={{ display: success.error ? 'block' : undefined }}
          color={'error'}
        >
          {success.message}
        </Typography>

        <TextField
          label="エンドポイント（日本語）"
          slotProps={{
            inputLabel: {
              shrink: true
            }
          }}
          fullWidth
          value={name_jp}
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setNameJp(e.target.value)
          }}
          onBlur={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setNameJp(e.target.value)
          }}
          sx={{ marginTop: margin }}
        />
        <TextField
          label="エンドポイント詳細説明"
          slotProps={{
            inputLabel: {
              shrink: true
            }
          }}
          fullWidth
          value={summary}
          placeholder="エンドポイントの詳細説明などを自由に入力してください。"
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setSummary(e.target.value)
          }}
          onBlur={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setSummary(e.target.value)
          }}
          multiline
          rows={5}
          sx={{ marginTop: margin }}
        />
        <TextField
          label="その他の説明"
          slotProps={{
            inputLabel: {
              shrink: true
            }
          }}
          fullWidth
          value={other}
          placeholder="その他備考情報など自由に入力してください。登録されるエントリスキーマ情報などを記述しておくと便利です。"
          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setOther(e.target.value)
          }}
          onBlur={(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setOther(e.target.value)
          }}
          multiline
          rows={5}
          sx={{ marginTop: margin }}
        />

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
            onClick={handleCreate}
            startIcon={Boolean(entry) ? <Edit /> : <Add />}
            disabled={success.error}
          >
            {Boolean(entry) ? '更新' : '新規作成'}
          </Button>
        </Box>
      </Box>
    </BasicModal>
  )
}

const Endpoint = () => {
  const { list, get: getEndpoint, post: createEndpoint, deleteEndpoint } = useEndpoint()
  const handleCreateClick = () => {
    setEditEntry(undefined)
    setShowCreateModal(true)
  }

  const [edit_entry, setEditEntry] = React.useState<VtecxApp.Entry>()

  const [show_create_modal, setShowCreateModal] = React.useState<boolean>(false)

  const [entry, setEntry] = React.useState<VtecxApp.Entry[]>([])

  React.useEffect(() => {
    const sortedEntries = (list.length ? list : []).sort((a, b) => {
      const idA = a.id
      const idB = b.id

      const startsWithUnderscoreA = idA.startsWith('/_')
      const startsWithUnderscoreB = idB.startsWith('/_')

      if (startsWithUnderscoreA !== startsWithUnderscoreB) {
        if (!startsWithUnderscoreA) {
          return -1
        }
        return 1
      }

      if (idA < idB) {
        return -1
      }
      if (idA > idB) {
        return 1
      }
      return 0
    })
    setEntry(sortedEntries)
  }, [list])

  const [dialog, setDialog] = React.useState<boolean>(false)
  const [delete_name, setDeleteeName] = React.useState<string | undefined>()
  const [messeage, setMesseage] = React.useState<
    { type: 'info' | 'error'; value: string } | undefined
  >()

  const afterCreate = React.useCallback(
    (success: boolean | undefined) => {
      const point = Boolean(edit_entry) ? '更新' : '作成'
      if (success) {
        getEndpoint()
        setMesseage({ type: 'info', value: `エンドポイントを${point}しました。` })
        setTimeout(() => {
          setMesseage(undefined)
        }, 10000)
      } else {
        setMesseage({
          type: 'error',
          value: `エンドポイントの${point}に失敗しました。もう一度お試しください。`
        })
      }
    },
    [edit_entry]
  )

  const afterDelete = React.useCallback(async () => {
    const success = await deleteEndpoint(delete_name)
    if (success) {
      getEndpoint()
      setMesseage({ type: 'info', value: `${delete_name}の削除しました。` })
      setTimeout(() => {
        setMesseage(undefined)
      }, 10000)
    } else {
      setMesseage({ type: 'error', value: `${delete_name}の削除に失敗しました。` })
    }
    setDialog(false)
  }, [delete_name])

  return (
    <MainContainer
      title={'エンドポイント管理'}
      action={
        <>
          <Tooltip title="Reload data" placement="top" enterDelay={1000}>
            <div>
              <IconButton size="small" aria-label="refresh" onClick={getEndpoint}>
                <Refresh />
              </IconButton>
            </div>
          </Tooltip>
          <Button
            variant="contained"
            onClick={handleCreateClick}
            sx={{ display: { xs: 'inherit', md: 'none' } }}
          >
            <Add />
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateClick}
            startIcon={<Add />}
            sx={{ display: { xs: 'none', md: 'inherit' } }}
          >
            追加
          </Button>
          <CreateModal
            open={show_create_modal}
            handleClose={() => {
              setShowCreateModal(false)
            }}
            create={createEndpoint}
            afterCreate={afterCreate}
            entry={edit_entry}
          />
          <CopyCommandMenu
            menu={[
              { label: 'download', value: 'npx vtecxutil download:folderacls' },
              { label: 'upload', value: 'npx vtecxutil upload:folderacls' }
            ]}
          />
        </>
      }
    >
      <Box paddingBottom={2} display={messeage ? 'block' : 'none'}>
        <Alert severity={messeage?.type}>{messeage?.value}</Alert>
      </Box>
      <TableContainer component={Paper} hidden={entry.length === 0}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="left" sx={{ display: { xs: 'table-cell', md: 'table-cell' } }}>
                エンドポイント
              </TableCell>
              <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                説明
              </TableCell>
              <TableCell align="left" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                権限
              </TableCell>
              <TableCell
                align="right"
                sx={{ display: { xs: 'none', md: 'table-cell' } }}
              ></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entry.map((entry: VtecxApp.Entry) => {
              const endpoint_name = entry.id && entry.id.split(',')[0]
              const is_service = endpoint_name && endpoint_name.indexOf('/_') !== -1
              const curd = entry.contributor
                ? entry.contributor.map((contributor: VtecxApp.Contributor, index: number) => {
                    return (
                      <Typography
                        variant="caption"
                        component={'div'}
                        key={'contributor' + entry.id + index}
                      >
                        {contributor.uri?.replace('urn:vte.cx:acl:', '')}
                      </Typography>
                    )
                  })
                : []
              return (
                <TableRow
                  key={entry.id}
                  hover
                  sx={{ backgroundColor: is_service ? grey[100] : undefined }}
                >
                  <TableCell align="left" sx={{ display: { xs: 'table-cell', md: 'table-cell' } }}>
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
                      {endpoint_name}
                    </Typography>
                    <Typography
                      variant="caption"
                      component={'div'}
                      sx={{
                        overflowWrap: 'break-word',
                        wordWrap: 'break-word',
                        maxWidth: {
                          xs: '300px',
                          md: '500px'
                        }
                      }}
                      color={grey[600]}
                      gutterBottom
                    >
                      {entry.title}
                    </Typography>
                  </TableCell>
                  <TableCell
                    component="th"
                    scope="row"
                    sx={{ display: { xs: 'none', md: 'table-cell' } }}
                  >
                    <Typography
                      variant="caption"
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
                      {entry.content ? entry.content.______text : undefined}
                    </Typography>
                    <Typography
                      variant="caption"
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
                      {entry.summary}
                    </Typography>
                  </TableCell>
                  <TableCell
                    component="th"
                    scope="row"
                    sx={{ display: { xs: 'none', md: 'table-cell' } }}
                  >
                    {curd}
                  </TableCell>
                  <TableCell align="right" sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {!is_service && (
                      <>
                        <Button
                          onClick={() => {
                            setEditEntry(entry)
                            setShowCreateModal(true)
                          }}
                        >
                          編集
                        </Button>
                        <Button
                          color="error"
                          onClick={async () => {
                            setMesseage(undefined)
                            setDeleteeName(endpoint_name)
                            setDialog(true)
                          }}
                        >
                          削除
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <AlertDialog
        title={`${delete_name}を削除しますか？`}
        open={dialog}
        onAgree={afterDelete}
        handleClose={() => {
          setDialog(false)
        }}
      >
        エンドポイント削除後は復旧することはできません。エンドポイント配下にあるデータも削除します。
      </AlertDialog>
    </MainContainer>
  )
}
export default Endpoint
