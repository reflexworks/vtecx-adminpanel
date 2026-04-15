import React from 'react'
import { Box, Typography, TextField, Button, Divider } from '@mui/material'
import { Add, Edit } from '@mui/icons-material'
import VtecxApp from '../../../../../../typings'
import BasicModal from '../../../../../parts/Modal'
import { fetcher } from '../../../../../../utils/fetcher'
import validation, { ValidationProps } from '../../../../../../utils/validation'
import {
  AclEntry,
  GroupOption,
  parseContributorUri,
  buildContributorUri,
  SPECIAL_GROUPS,
  DEFAULT_GROUP_LABELS
} from '../../types'
import { AclEditor } from '../acl/AclEditor'

export const CreateModal = ({
  open,
  handleClose,
  create,
  afterCreate,
  entry
}: {
  open: boolean
  handleClose: () => void
  create: (params: {
    name: string
    name_jp?: string
    summary?: string
    other?: string
    contributor?: VtecxApp.Contributor[]
  }) => Promise<boolean | undefined>
  afterCreate: (success: boolean | undefined) => void
  entry?: VtecxApp.Entry
}) => {
  const [create_name, setCreateName] = React.useState('')
  const [name_jp, setNameJp] = React.useState('')
  const [summary, setSummary] = React.useState('')
  const [other, setOther] = React.useState('')
  const [aclEntries, setAclEntries] = React.useState<AclEntry[]>([])
  const [groupOptions, setGroupOptions] = React.useState<GroupOption[]>([])
  const [groupsLoading, setGroupsLoading] = React.useState(false)
  const [groupsForbidden, setGroupsForbidden] = React.useState(false)
  const [nameValid, setNameValid] = React.useState<ValidationProps>({ error: true, message: '' })

  React.useEffect(() => {
    if (!open) return
    setCreateName(entry?.id?.split(',')[0].replace('/', '') ?? '')
    setNameJp(entry?.title ?? '')
    setSummary(entry?.content?.______text ?? '')
    setOther(entry?.summary ?? '')
    setNameValid({ error: !entry, message: '' })
    const parsed: AclEntry[] = []
    if (entry?.contributor) {
      for (const c of entry.contributor) {
        if (c.uri) {
          const e = parseContributorUri(c.uri)
          if (e) parsed.push(e)
        }
      }
    }
    const adminEntry: AclEntry = {
      group: '/_group/$admin',
      permissions: { C: true, R: true, U: true, D: true, E: false }
    }
    const hasAdmin = parsed.some(e => e.group === '/_group/$admin')
    setAclEntries(hasAdmin ? parsed : [adminEntry, ...parsed])
    setGroupsLoading(true)
    setGroupsForbidden(false)
    fetcher('/d/_group?f', 'get')
      .then(res => {
        const raw = res?.data
        const fetched: GroupOption[] = []
        if (Array.isArray(raw)) {
          raw.forEach((e: VtecxApp.Entry) => {
            const href = e.link?.[0]?.___href
            if (href && href !== '/_group/$admin')
              fetched.push({
                value: href,
                label: DEFAULT_GROUP_LABELS[href] ?? href.replace(/^\/_group\//, ''),
                isSpecial: false
              })
          })
        }
        const ORDER: Record<string, number> = {
          '*': 0,
          '+': 1,
          '/_group/$useradmin': 2,
          '/_group/$content': 3
        }
        const all: GroupOption[] = [
          ...fetched,
          ...SPECIAL_GROUPS.filter(s => !fetched.some(f => f.value === s.value))
        ].sort((a, b) => {
          const oa = ORDER[a.value] ?? 100
          const ob = ORDER[b.value] ?? 100
          if (oa !== ob) return oa - ob
          return a.value.localeCompare(b.value)
        })
        setGroupOptions(all)
        setGroupsLoading(false)
      })
      .catch((err: any) => {
        setGroupsLoading(false)
        if (err?.response?.status === 403) setGroupsForbidden(true)
        else setGroupOptions([...SPECIAL_GROUPS])
      })
  }, [open])

  const handleSave = async () => {
    if (!create_name) return
    const contributor: VtecxApp.Contributor[] = aclEntries
      .filter(e => Object.values(e.permissions).some(Boolean))
      .map(e => ({ uri: buildContributorUri(e) }))
    const success = await create({
      name: create_name,
      name_jp: name_jp || undefined,
      summary: summary || undefined,
      other: other || undefined,
      contributor: contributor.length > 0 ? contributor : undefined
    })
    afterCreate(success)
    handleClose()
  }

  const isEditing = Boolean(entry)
  const hasInvalidAcl = aclEntries
    .filter(e => e.group !== '/_group/$admin')
    .some(e => {
      const { C, R, U, D } = e.permissions
      return !C && !R && !U && !D
    })
  const canSave = (isEditing || !nameValid.error) && !hasInvalidAcl

  return (
    <BasicModal open={open} handleClose={handleClose} data-testid="ep-modal">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="h6" fontWeight={700}>
          {isEditing ? 'エンドポイント編集' : 'エンドポイント新規作成'}
        </Typography>
      </Box>
      <Box component="form" noValidate autoComplete="off">
        <TextField
          label="エンドポイント"
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { 'data-testid': 'ep-name-input' }
          }}
          fullWidth
          value={create_name}
          placeholder="半角英数とアンダーバー(_)が使用可能です。"
          onChange={e => {
            setNameValid(validation('endpoint', e.target.value))
            setCreateName(e.target.value)
          }}
          error={!isEditing && nameValid.error && create_name !== ''}
          disabled={isEditing}
          sx={{ mt: 3 }}
        />
        {!isEditing && nameValid.error && nameValid.message && create_name !== '' && (
          <Typography variant="caption" color="error" data-testid="ep-name-error">
            {nameValid.message}
          </Typography>
        )}
        <TextField
          label="エンドポイント（日本語）"
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
          value={name_jp}
          onChange={e => setNameJp(e.target.value)}
          sx={{ mt: 3 }}
        />
        <TextField
          label="詳細説明"
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
          multiline
          rows={2}
          value={summary}
          placeholder="エンドポイントの説明などを入力してください。"
          onChange={e => setSummary(e.target.value)}
          sx={{ mt: 3 }}
        />
        <TextField
          label="その他の説明"
          slotProps={{ inputLabel: { shrink: true } }}
          fullWidth
          multiline
          rows={2}
          value={other}
          placeholder="備考やスキーマ情報などを記述しておくと便利です。"
          onChange={e => setOther(e.target.value)}
          sx={{ mt: 3 }}
        />
        <Divider sx={{ mt: 3 }} />
        <AclEditor
          aclEntries={aclEntries}
          onChange={setAclEntries}
          groupOptions={groupOptions}
          loading={groupsLoading}
          forbidden={groupsForbidden}
        />
        <Box display="flex" justifyContent="flex-end" gap={1.5} mt={3}>
          <Button color="inherit" variant="outlined" onClick={handleClose}>
            キャンセル
          </Button>
          <Button
            color="success"
            variant="contained"
            onClick={handleSave}
            startIcon={isEditing ? <Edit /> : <Add />}
            disabled={!canSave}
            data-testid="ep-save-button"
          >
            {isEditing ? '更新' : '新規作成'}
          </Button>
        </Box>
      </Box>
    </BasicModal>
  )
}
