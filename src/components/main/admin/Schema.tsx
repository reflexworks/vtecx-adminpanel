import React from 'react'
import MainContainer from '../../parts/Container'
import { Refresh, Add, Edit } from '@mui/icons-material'
import {
  Tooltip,
  IconButton,
  Box,
  Alert,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Stack,
  Autocomplete,
  Chip
} from '@mui/material'
import CopyCommandMenu from '../../parts/CopyCommandMenu'
import useSchema from '../../../hooks/useSchema'
import { green, grey } from '@mui/material/colors'
import BasicModal from '../../parts/Modal'
import validation, { ValidationProps } from '../../../utils/validation'
import generateSchemaUpdateRequest, {
  SchemaFormData
} from '../../../utils/schema/generateSchemaUpdateRequest'
import VtecxApp from '../../../typings'

// スキーマテキストから親候補を抽出
const getParentOptions = (xmlText: string | undefined): string[] => {
  if (!xmlText) return []
  const options: string[] = []
  const lines = xmlText.split('\n')
  const stack: { indent: number; name: string }[] = []

  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return
    const indent = line.match(/^ */)?.[0].length || 0
    const typeMatch = trimmed.match(/\(([^)]+)\)/)
    const type = typeMatch ? typeMatch[1].toLowerCase() : null
    const name = trimmed.split(/[(!{ ]/)[0]

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }
    const currentPath = stack.length > 0 ? stack.map(s => s.name).join('.') + '.' + name : name
    const canBeParent = !type || ['string', 'array', 'desc'].includes(type)
    if (canBeParent) options.push(currentPath)
    stack.push({ indent, name })
  })
  return Array.from(new Set(options)).sort()
}

const SchemaEditModal = ({
  open,
  handleClose,
  onSubmit,
  editEntry,
  data
}: {
  open: boolean
  handleClose: () => void
  onSubmit: (formData: SchemaFormData) => void
  editEntry?: SchemaFormData
  data?: VtecxApp.Entry
}) => {
  const [formData, setFormData] = React.useState<SchemaFormData>({
    schema_name: '',
    wamei: '',
    type: '指定なし',
    validation: '',
    option: '',
    acl: '',
    index: '',
    isRequired: false,
    isIndexAndAcl: false,
    isEncrypted: false,
    parentName: ''
  })

  const [valid, setValid] = React.useState<ValidationProps>({ error: true, message: '' })

  const parentOptions = React.useMemo(
    () => getParentOptions(data?.content?.______text),
    [data?.content?.______text]
  )

  React.useEffect(() => {
    if (open) {
      if (editEntry) {
        setFormData({ ...editEntry })
        setValid({ error: false, message: '' })
      } else {
        setFormData({
          schema_name: '',
          wamei: '',
          type: '指定なし',
          validation: '',
          option: '',
          acl: '',
          index: '',
          isRequired: false,
          isIndexAndAcl: false,
          isEncrypted: false,
          parentName: ''
        })
        setValid({ error: true, message: '' })
      }
    }
  }, [open, editEntry])

  const handleChange = (field: keyof SchemaFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (field === 'schema_name') {
      setValid(validation('schema_name', value))
    }
  }

  const typeOptions = formData.parentName
    ? ['指定なし', 'String', 'Integer', 'Date', 'Boolean', 'Long', 'Float', 'Double', 'Desc']
    : [
        '指定なし',
        'Array',
        'String',
        'Integer',
        'Date',
        'Boolean',
        'Long',
        'Float',
        'Double',
        'Desc'
      ]

  return (
    <BasicModal open={open} handleClose={handleClose}>
      <Typography variant="h6">
        {editEntry?.schema_name ? 'スキーマ編集' : 'スキーマ追加'}
      </Typography>
      <Box paddingTop={3} component="form" noValidate>
        <Stack spacing={3}>
          <Autocomplete
            options={parentOptions}
            value={formData.parentName || null}
            onChange={(_, newValue) => handleChange('parentName', newValue || '')}
            renderInput={params => (
              <TextField
                {...params}
                label="親パス (任意)"
                placeholder="親を検索・選択"
                slotProps={{
                  inputLabel: {
                    shrink: true
                  }
                }}
              />
            )}
            clearOnEscape
          />
          <TextField
            label="スキーマ名"
            fullWidth
            value={formData.schema_name}
            onChange={e => handleChange('schema_name', e.target.value)}
            error={valid.error}
            helperText={valid.message}
            slotProps={{
              inputLabel: {
                shrink: true
              }
            }}
          />
          <TextField
            label="和名"
            fullWidth
            value={formData.wamei}
            onChange={e => handleChange('wamei', e.target.value)}
            slotProps={{
              inputLabel: {
                shrink: true
              }
            }}
          />
          <FormControl fullWidth>
            <InputLabel>型</InputLabel>
            <Select
              value={formData.type}
              label="型"
              onChange={e => handleChange('type', e.target.value)}
            >
              {typeOptions.map(opt => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {/**
          <FormControlLabel
            control={
              <Switch
                checked={formData.isRequired}
                onChange={e => handleChange('isRequired', e.target.checked)}
              />
            }
            label="必須項目"
          />
           */}
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={formData.index ? formData.index.split('|').filter(i => i !== '') : []}
            onChange={(_, newValue) => handleChange('index', newValue.join('|'))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option}
                  {...getTagProps({ index })}
                  key={index}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))
            }
            renderInput={params => (
              <TextField
                {...params}
                label="検索インデックス (複数対応)"
                placeholder="Enterで追加"
                slotProps={{
                  inputLabel: {
                    shrink: true
                  }
                }}
              />
            )}
          />
          <Stack direction="row" spacing={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isIndexAndAcl}
                  onChange={e => handleChange('isIndexAndAcl', e.target.checked)}
                  disabled={!formData.index}
                />
              }
              label={<Typography variant="caption">全文検索Index (;)</Typography>}
            />
            {/**
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isEncrypted}
                  onChange={e => handleChange('isEncrypted', e.target.checked)}
                />
              }
              label={<Typography variant="caption">暗号化 (#)</Typography>}
            />
           */}
          </Stack>
          {/**
          <Stack direction="row" spacing={2}>
            <TextField
              label="ACL権限 (=)"
              fullWidth
              value={formData.acl}
              onChange={e => handleChange('acl', e.target.value)}
              slotProps={{
                inputLabel: {
                  shrink: true
                }
              }}
            />
            <TextField
              label="Option {}"
              fullWidth
              value={formData.option}
              onChange={e => handleChange('option', e.target.value)}
              slotProps={{
                inputLabel: {
                  shrink: true
                }
              }}
            />
          </Stack>
           */}
        </Stack>
        <Box paddingTop={4} display="flex" justifyContent="flex-end">
          <Button onClick={handleClose} sx={{ marginRight: 2 }}>
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              onSubmit(formData)
              handleClose()
            }}
            disabled={valid.error || !formData.schema_name}
            startIcon={editEntry?.schema_name ? <Edit /> : <Add />}
          >
            {editEntry?.schema_name ? '更新' : '保存'}
          </Button>
        </Box>
      </Box>
    </BasicModal>
  )
}

const Schema = () => {
  const { list: schemas, get: getSchema, data, put: putSchema, error: schema_error } = useSchema()
  const [messeage, setMesseage] = React.useState<
    { type: 'info' | 'error'; value: string | React.ReactNode } | undefined
  >()
  const [showModal, setShowModal] = React.useState(false)
  const [editFormData, setEditFormData] = React.useState<SchemaFormData | undefined>(undefined)
  const [oldName, setOldName] = React.useState<string | null>(null)

  const handleEdit = (formData: SchemaFormData) => {
    setEditFormData(formData)
    setOldName(formData.schema_name)
    setShowModal(true)
  }

  const handleAddChild = (parentPath: string) => {
    setEditFormData({
      schema_name: '',
      wamei: '',
      type: '指定なし',
      isRequired: false,
      parentName: parentPath,
      validation: '',
      option: '',
      acl: '',
      index: '',
      isIndexAndAcl: false,
      isEncrypted: false
    })
    setOldName(null)
    setShowModal(true)
  }

  const handleSubmit = async (formData: SchemaFormData) => {
    const context = {
      currentContent: data?.content?.______text || '',
      currentRights: data?.rights || '',
      oldSchemaName: oldName
    }
    const req = generateSchemaUpdateRequest(formData, context)
    const res = await putSchema(req)
    if (res) {
      getSchema()
      setMesseage({
        type: 'info',
        value: (
          <div>
            スキーマの更新に成功しました。以下のコマンドを実行してローカルに保存してください。
            <div>npx vtecxutil download:template</div>
            <div>npx vtecxutil download:typings</div>
          </div>
        )
      })
    }
  }

  return (
    <MainContainer
      title={'エントリスキーマ管理'}
      action={
        <>
          <IconButton size="small" onClick={getSchema}>
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditFormData(undefined)
              setOldName(null)
              setShowModal(true)
            }}
          >
            追加
          </Button>
          <CopyCommandMenu
            menu={[
              { label: 'download', value: 'npx vtecxutil download:template' },
              { label: 'upload', value: 'npx vtecxutil upload:template' },
              { label: 'types', value: 'npx vtecxutil download:typings' }
            ]}
          />
        </>
      }
    >
      <Box paddingBottom={2} display={messeage ? 'block' : 'none'}>
        <Alert severity={messeage?.type} onClose={() => setMesseage(undefined)}>
          {messeage?.value}
        </Alert>
      </Box>
      <Box paddingBottom={2} display={schema_error ? 'block' : 'none'}>
        <Alert severity={'error'}>
          {schema_error?.response?.data?.feed?.title || schema_error?.response?.data}
        </Alert>
      </Box>

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Typography variant="caption" component={'div'}>
                  和名
                </Typography>
                <Typography variant="caption" component={'div'}>
                  項目名
                </Typography>
              </TableCell>
              <TableCell align="center">型</TableCell>
              <TableCell align="left">検索index</TableCell>
              <TableCell align="left">全文検索</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {schemas?.map((schema: SchemaFormData, idx: number) => {
              const fullPath = schema.parentName
                ? `${schema.parentName}.${schema.schema_name}`
                : schema.schema_name
              const isStringOrNone = schema.type === 'String' || schema.type === '指定なし'
              const nextSchema = schemas[idx + 1]
              const hasChild =
                nextSchema?.parentName === fullPath ||
                nextSchema?.parentName?.startsWith(fullPath + '.')

              return (
                <TableRow
                  hover
                  key={fullPath + idx}
                  style={{ background: hasChild ? green[50] : undefined }}
                >
                  <TableCell>
                    <Typography variant="caption" color={grey[700]} component={'div'}>
                      {schema.wamei || '-'}
                    </Typography>
                    <Typography variant="body2" color={grey[500]} component={'span'}>
                      {schema.parentName ? schema.parentName + '.' : schema.parentName}
                    </Typography>
                    <Typography variant="body2" component={'span'}>
                      {schema.schema_name}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="caption">
                      {schema.type === '指定なし' ? '-' : schema.type}
                    </Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="caption">{schema.index.replace('|', ', ')}</Typography>
                  </TableCell>
                  <TableCell align="left">
                    <Typography variant="h5">{schema.isIndexAndAcl ? '○' : undefined}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" justifyContent="flex-end">
                      {!hasChild && (
                        <Tooltip title="編集">
                          <IconButton size="small" onClick={() => handleEdit(schema)}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {isStringOrNone && (
                        <Tooltip title="子の項目を追加">
                          <IconButton size="small" onClick={() => handleAddChild(fullPath)}>
                            <Add fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <SchemaEditModal
        open={showModal}
        handleClose={() => setShowModal(false)}
        onSubmit={handleSubmit}
        editEntry={editFormData}
        data={data}
      />
    </MainContainer>
  )
}

export default Schema
